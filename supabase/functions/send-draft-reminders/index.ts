// Edge Function : send-draft-reminders
// Relance les couples qui ont commencé un menu sans l'envoyer.
// Appelée toutes les heures par pg_cron (cf. supabase/cron/), protégée par
// l'en-tête secret x-cron-secret (CRON_SECRET). Sans secret configuré, tout
// est refusé. Déployée sans vérification JWT (verify_jwt = false).
//
// Cible : brouillons avec email, inactifs depuis 24 h à 7 jours, jamais
// relancés, sans désinscription. Au plus 50 envois par exécution, une seule
// relance par brouillon.

import { adminClient, env, json, safeEqual } from '../_shared/guard.ts'
import { sendEmail } from '../_shared/resend.ts'
import { reminderEmail, stepLabelOf } from './email.ts'

const MAX_PER_RUN = 50
const HOUR = 60 * 60 * 1000

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée.' }, 405)

  const secret = env('CRON_SECRET')
  if (!secret || !safeEqual(req.headers.get('x-cron-secret') ?? '', secret)) {
    console.warn('[relances] appel refusé : secret absent ou invalide')
    return json({ ok: false, error: 'Non autorisé.' }, 401)
  }

  const apiKey = env('RESEND_API_KEY')
  const from = env('FROM_EMAIL')
  const siteUrl = env('SITE_URL').replace(/\/+$/, '')
  if (!apiKey || !from || !siteUrl) {
    console.error('[relances] RESEND_API_KEY, FROM_EMAIL ou SITE_URL manquant : rien n’est envoyé')
    return json({ ok: false, error: 'Configuration incomplète.' }, 500)
  }
  const functionsUrl = `${env('SUPABASE_URL').replace(/\/+$/, '')}/functions/v1`

  try {
    const admin = adminClient()
    const now = Date.now()
    const { data: drafts, error } = await admin
      .from('compositions')
      .select('id, share_token, couple_names, email, wedding_date, last_step')
      .eq('status', 'draft')
      .not('email', 'is', null)
      .is('reminder_sent_at', null)
      .eq('reminders_opt_out', false)
      .lte('updated_at', new Date(now - 24 * HOUR).toISOString())
      .gte('updated_at', new Date(now - 7 * 24 * HOUR).toISOString())
      .order('updated_at', { ascending: true })
      .limit(MAX_PER_RUN)
    if (error) throw new Error(`recherche des brouillons : ${error.message}`)

    const { data: steps, error: stepsError } = await admin.from('steps').select('slug, title, group_slug, group_title')
    if (stepsError) throw new Error(`lecture des étapes : ${stepsError.message}`)

    let sent = 0
    let failed = 0
    for (const d of drafts ?? []) {
      // Réservation : si une autre exécution l'a déjà pris, on passe.
      const { data: claimed, error: claimError } = await admin
        .from('compositions')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', d.id)
        .is('reminder_sent_at', null)
        .select('id')
      if (claimError) {
        console.error(`[relances] réservation ${d.id} :`, claimError)
        failed++
        continue
      }
      if (!claimed || claimed.length === 0) continue

      const token = d.share_token as string
      const mail = reminderEmail({
        coupleNames: d.couple_names ?? '',
        weddingDate: d.wedding_date,
        stepLabel: stepLabelOf(d.last_step, steps ?? []),
        resumeUrl: `${siteUrl}/reprendre/${token}`,
        unsubscribeUrl: `${siteUrl}/desinscription/${token}`,
        traiteurPhone: env('TRAITEUR_PHONE') || null,
      })
      const ok = await sendEmail({
        apiKey,
        from,
        to: d.email as string,
        replyTo: env('REPLY_TO_EMAIL') || undefined,
        subject: mail.subject,
        html: mail.html,
        headers: {
          // Désinscription en un clic depuis la messagerie (RFC 8058).
          'List-Unsubscribe': `<${functionsUrl}/draft-opt-out?token=${token}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      if (ok) sent++
      else {
        failed++
        // Échec d'envoi : on libère la réservation pour réessayer plus tard.
        await admin.from('compositions').update({ reminder_sent_at: null }).eq('id', d.id)
      }
    }

    console.log(`[relances] ${sent} envoyée(s), ${failed} échec(s)`)
    return json({ ok: true, sent, failed }, 200)
  } catch (e) {
    console.error('[relances] erreur inattendue :', e)
    return json({ ok: false, error: 'Erreur interne.' }, 500)
  }
})

// Edge Function : send-weekly-digest
// Résumé du lundi matin envoyé à TRAITEUR_EMAIL : demandes sans premier
// contact depuis plus de 48 h, demandes en cours depuis plus de 14 jours, et
// bilan de la semaine. « Rien en attente, bravo » si tout est à jour.
// Appelée par pg_cron (cf. supabase/cron/weekly-digest.sql), protégée par
// l'en-tête secret x-cron-secret (CRON_SECRET). Déployée sans vérification
// JWT (verify_jwt = false). Corps { "force": true } : envoi immédiat (test).

import { brandContact } from '../_shared/brand.ts'
import { adminClient, env, json, safeEqual } from '../_shared/guard.ts'
import { sendEmail } from '../_shared/resend.ts'
import { buildDigest, digestEmail, isParisMonday8, type DigestNote, type DigestRow } from './digest.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée.' }, 405)

  const secret = env('CRON_SECRET')
  if (!secret || !safeEqual(req.headers.get('x-cron-secret') ?? '', secret)) {
    console.warn('[résumé] appel refusé : secret absent ou invalide')
    return json({ ok: false, error: 'Non autorisé.' }, 401)
  }

  let force = false
  try {
    force = (await req.json())?.force === true
  } catch {
    // corps vide : appel normal de pg_cron
  }
  if (!force && !isParisMonday8(new Date())) {
    return json({ ok: true, skipped: 'pas lundi 8 h à Paris' }, 200)
  }

  const apiKey = env('RESEND_API_KEY')
  const from = env('FROM_EMAIL')
  const to = env('TRAITEUR_EMAIL')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!apiKey || !from || to.length === 0) {
    console.error('[résumé] RESEND_API_KEY, FROM_EMAIL ou TRAITEUR_EMAIL manquant : rien n’est envoyé')
    return json({ ok: false, error: 'Configuration incomplète.' }, 500)
  }
  const siteUrl = env('SITE_URL').replace(/\/+$/, '')

  try {
    const admin = adminClient()
    const { data: rows, error } = await admin
      .from('compositions')
      .select('id, couple_names, phone, wedding_date, crm_status, created_at, consent_at, contacted_at, ajout_manuel')
      .eq('status', 'submitted')
      .eq('is_test', false)
    if (error) throw new Error(`lecture des demandes : ${error.message}`)
    const ids = new Set((rows ?? []).map((r) => r.id as string))

    const { data: notes, error: notesError } = await admin
      .from('composition_notes')
      .select('composition_id, to_status, created_at')
      .eq('kind', 'statut')
    if (notesError) throw new Error(`lecture de l’historique : ${notesError.message}`)

    const digest = buildDigest(
      (rows ?? []) as DigestRow[],
      ((notes ?? []) as DigestNote[]).filter((n) => ids.has(n.composition_id)), // tests exclus
    )
    const mail = digestEmail(digest, { adminUrl: siteUrl ? `${siteUrl}/admin` : null, brand: brandContact(env) })
    const ok = await sendEmail({ apiKey, from, to, subject: mail.subject, html: mail.html })
    console.log(`[résumé] ${ok ? 'envoyé' : 'ÉCHEC'} : ${digest.waiting.length} à rappeler, ${digest.stalled.length} en attente`)
    return json({ ok, waiting: digest.waiting.length, stalled: digest.stalled.length }, ok ? 200 : 502)
  } catch (e) {
    console.error('[résumé] erreur inattendue :', e)
    return json({ ok: false, error: 'Erreur interne.' }, 500)
  }
})

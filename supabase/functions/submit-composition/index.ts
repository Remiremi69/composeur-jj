// Edge Function : submit-composition
// Point d'entrée UNIQUE de l'envoi d'un menu. Le front n'écrit jamais
// directement dans les tables.
//
// Chaîne de traitement :
//   CORS strict → POST ≤ 50 ko → honeypot → délai minimal → limite de débit
//   → Turnstile (si configuré) → validation (noyau partagé) → prix recalculé
//   → submit_composition (atomique : le brouillon passe en « envoyé », même
//   id) → emails (une seule fois) → réponse.
//
// Aucune trace technique n'est renvoyée au client : tout est journalisé ici.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { isShareToken, sanitizeAttribution } from '../_shared/core/draft.ts'
import { computeEstimate } from '../_shared/core/pricing.ts'
import type { Catalog, CompositionPayload } from '../_shared/core/types.ts'
import { normalizePhone, validateComposition } from '../_shared/core/validation.ts'
import {
  adminClient,
  checkRateLimit,
  env,
  GENERIC_ERROR,
  guardRequest,
  ipHashOf,
  isHoneypotFilled,
  isHumanTiming,
  json,
  passesTurnstile,
  readJsonObject,
} from '../_shared/guard.ts'
import { buildRecap, type RecapData } from '../_shared/recap.ts'
import { sendEmail } from '../_shared/resend.ts'
import { coupleEmail, traiteurEmail } from './emails.ts'
import { buildPdf } from './pdf.ts'

// Ne garde que les champs attendus de la composition (le reste est ignoré).
function pickPayload(body: Record<string, unknown>): Record<string, unknown> {
  return {
    coupleNames: body.coupleNames,
    email: body.email,
    weddingDate: body.weddingDate,
    guestCount: body.guestCount,
    formuleId: body.formuleId,
    selections: body.selections,
    optionIds: body.optionIds ?? [],
    phone: body.phone,
    venue: body.venue,
    dietaryNotes: body.dietaryNotes,
    message: body.message,
  }
}

function optionalText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

Deno.serve(async (req) => {
  const guard = guardRequest(req, ['POST'])
  if (!guard.ok) return guard.response
  const { cors } = guard

  try {
    const read = await readJsonObject(req, cors)
    if (!read.ok) return read.response
    const { body } = read

    // --- Anti-spam ------------------------------------------------------
    if (isHoneypotFilled(body)) {
      console.warn('[submit] honeypot rempli : soumission ignorée')
      return json({ ok: true }, 200, cors)
    }
    if (!isHumanTiming(body.startedAt, body.sentAt)) {
      console.warn('[submit] envoi trop rapide ou horodatage absent')
      return json(
        { ok: false, error: 'Merci de prendre quelques secondes avant d’envoyer votre menu.' },
        400,
        cors,
      )
    }

    const admin = adminClient()
    if (!(await checkRateLimit(admin, await ipHashOf(req), 'submit'))) {
      console.warn('[submit] limite de débit atteinte')
      return json(
        {
          ok: false,
          error: 'Vous avez envoyé plusieurs menus en peu de temps. Merci de réessayer dans une heure.',
        },
        429,
        cors,
      )
    }
    if (!(await passesTurnstile(req, body.turnstileToken))) {
      console.warn('[submit] vérification Turnstile échouée')
      return json(
        { ok: false, error: 'La vérification anti-robot a échoué. Merci de réessayer.' },
        403,
        cors,
      )
    }

    // --- Catalogue (y compris inactifs, pour pouvoir les refuser) --------
    const catalog = await loadCatalog(admin)

    // --- Validation + prix recalculé côté serveur -----------------------
    const candidate = pickPayload(body)
    const validation = validateComposition(catalog, candidate)
    if (!validation.ok) {
      return json({ ok: false, errors: validation.errors }, 422, cors)
    }
    const payload = candidate as unknown as CompositionPayload
    const formule = catalog.formules.find((f) => f.id === payload.formuleId)!
    const phone = normalizePhone(payload.phone)!
    const dietaryNotes = optionalText(payload.dietaryNotes)
    const message = optionalText(payload.message)
    const { source, landingParams } = sanitizeAttribution(body.source, body.landingParams)
    const shareToken = isShareToken(body.shareToken) ? body.shareToken : null
    // Le total éventuellement envoyé par le navigateur est ignoré.
    const estimate = computeEstimate(
      formule,
      catalog.items,
      payload.selections,
      catalog.options,
      payload.optionIds,
      payload.guestCount,
    )

    // --- Enregistrement atomique -----------------------------------------
    const { data: saved, error: saveError } = await admin.rpc('submit_composition', {
      p: {
        share_token: shareToken,
        formule_id: payload.formuleId,
        couple_names: payload.coupleNames.trim(),
        email: payload.email.trim(),
        phone,
        wedding_date: payload.weddingDate || null,
        guest_count: payload.guestCount,
        venue: payload.venue.trim(),
        dietary_notes: dietaryNotes,
        message,
        source,
        landing_params: landingParams,
        total_estimate: estimate.total,
        items: Object.entries(payload.selections).map(([item_id, quantity]) => ({ item_id, quantity })),
        option_ids: payload.optionIds,
      },
    })
    const row = Array.isArray(saved) ? saved[0] : null
    if (saveError || !row) {
      throw new Error(`submit_composition : ${saveError?.message ?? 'aucune ligne renvoyée'}`)
    }
    const compositionId: string = row.id
    const token: string = row.share_token

    // --- Emails (n'empêchent jamais la réponse : la demande est enregistrée)
    let emailSent = false
    try {
      const recap = buildRecap(
        catalog,
        formule,
        {
          coupleNames: payload.coupleNames,
          weddingDate: payload.weddingDate || null,
          guestCount: payload.guestCount,
          selections: payload.selections,
          optionIds: payload.optionIds,
          contact: {
            email: payload.email.trim(),
            phone,
            venue: payload.venue.trim(),
            dietaryNotes,
            message,
          },
        },
        estimate,
      )
      emailSent = await sendCompositionEmails(admin, compositionId, recap, source)
    } catch (e) {
      console.error(`[submit] envoi des emails (${compositionId}) :`, e)
    }

    return json({ ok: true, compositionId, shareToken: token, emailSent, estimate }, 200, cors)
  } catch (e) {
    console.error('[submit] erreur inattendue :', e)
    return json({ ok: false, error: GENERIC_ERROR }, 500, cors)
  }
})

async function loadCatalog(admin: SupabaseClient): Promise<Catalog> {
  const [formules, steps, items, options] = await Promise.all([
    admin.from('formules').select('*'),
    admin.from('steps').select('*'),
    admin.from('items').select('*'),
    admin.from('options').select('*'),
  ])
  const error = formules.error ?? steps.error ?? items.error ?? options.error
  if (error) throw new Error(`chargement du catalogue : ${error.message}`)
  return {
    formules: formules.data ?? [],
    steps: steps.data ?? [],
    items: items.data ?? [],
    options: options.data ?? [],
  }
}

// Envoie les deux emails une seule fois par composition (emails_sent_at).
// Renvoie true si l'email récapitulatif du couple est bien parti.
async function sendCompositionEmails(
  admin: SupabaseClient,
  compositionId: string,
  recap: RecapData,
  source: string | null,
): Promise<boolean> {
  const { data: comp, error } = await admin
    .from('compositions')
    .select('emails_sent_at')
    .eq('id', compositionId)
    .single()
  if (error) throw new Error(`lecture emails_sent_at : ${error.message}`)
  if (comp?.emails_sent_at) {
    console.warn(`[emails] déjà envoyés pour ${compositionId} : rien n'est renvoyé`)
    return true
  }

  const apiKey = env('RESEND_API_KEY')
  const from = env('FROM_EMAIL')
  if (!apiKey || !from || !recap.contact) {
    console.error('[emails] RESEND_API_KEY ou FROM_EMAIL manquant : aucun email envoyé')
    return false
  }

  let pdfBase64: string | null = null
  try {
    pdfBase64 = encodeBase64(await buildPdf(recap))
  } catch (e) {
    console.error('[emails] génération du PDF impossible, envoi sans pièce jointe :', e)
  }

  const traiteurTo = env('TRAITEUR_EMAIL')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  let traiteurOk = false
  if (traiteurTo.length) {
    const t = traiteurEmail(recap, source)
    traiteurOk = await sendEmail({
      apiKey,
      from,
      to: traiteurTo,
      replyTo: recap.contact.email, // le traiteur répond directement au couple
      subject: t.subject,
      html: t.html,
      pdfBase64,
    })
  } else {
    console.error('[emails] TRAITEUR_EMAIL absent : notification traiteur non envoyée')
  }

  const c = coupleEmail(recap)
  const coupleOk = await sendEmail({
    apiKey,
    from,
    to: recap.contact.email,
    replyTo: env('REPLY_TO_EMAIL') || undefined,
    subject: c.subject,
    html: c.html,
    pdfBase64,
  })

  if (traiteurOk && coupleOk) {
    const { error: markError } = await admin
      .from('compositions')
      .update({ emails_sent_at: new Date().toISOString() })
      .eq('id', compositionId)
    if (markError) console.error(`[emails] marquage emails_sent_at (${compositionId}) :`, markError)
  }
  return coupleOk
}

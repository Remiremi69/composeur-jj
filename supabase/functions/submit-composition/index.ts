// Edge Function : submit-composition
// Point d'entrée UNIQUE de la soumission d'un menu. Le front n'écrit jamais
// directement dans les tables.
//
// Chaîne de traitement :
//   CORS strict → POST ≤ 50 ko → honeypot → délai minimal → limite de débit
//   → Turnstile (si configuré) → validation (noyau partagé) → prix recalculé
//   → create_composition (atomique) → emails (une seule fois) → réponse.
//
// Aucune trace technique n'est renvoyée au client : tout est journalisé ici.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { computeEstimate } from '../_shared/core/pricing.ts'
import type { Catalog, CompositionPayload } from '../_shared/core/types.ts'
import { validateComposition } from '../_shared/core/validation.ts'
import {
  checkRateLimit,
  clientIp,
  isHoneypotFilled,
  isHumanTiming,
  sha256Hex,
  verifyTurnstile,
} from './antispam.ts'
import { corsHeaders, isOriginAllowed, normalizeOrigin } from './cors.ts'
import { coupleEmail, sendEmail, traiteurEmail } from './emails.ts'
import { buildPdf } from './pdf.ts'
import { buildRecap } from './recap.ts'

const MAX_BODY_BYTES = 50 * 1024

const env = (name: string) => (Deno.env.get(name) ?? '').trim()

const GENERIC_ERROR = 'Une erreur est survenue. Merci de réessayer dans un instant.'

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// Lit le corps en ne conservant que MAX_BODY_BYTES octets. Le flux est vidé
// jusqu'au bout même s'il est trop gros : répondre sans le consommer bloque
// la passerelle (504) au lieu de renvoyer un 413 propre.
async function readBodyLimited(req: Request): Promise<{ text: string; tooLarge: boolean }> {
  if (!req.body) return { text: '', tooLarge: false }
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size <= MAX_BODY_BYTES) chunks.push(value)
  }
  if (size > MAX_BODY_BYTES) return { text: '', tooLarge: true }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    bytes.set(c, offset)
    offset += c.byteLength
  }
  return { text: new TextDecoder().decode(bytes), tooLarge: false }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Ne garde que les champs attendus de la composition (le reste est ignoré).
function pickPayload(body: Record<string, unknown>): Record<string, unknown> {
  return {
    coupleNames: body.coupleNames,
    email: body.email,
    phone: body.phone,
    weddingDate: body.weddingDate,
    guestCount: body.guestCount,
    formuleId: body.formuleId,
    selections: body.selections,
    optionIds: body.optionIds ?? [],
  }
}

Deno.serve(async (req) => {
  const origin = normalizeOrigin(req.headers.get('origin'))
  if (!isOriginAllowed(origin)) {
    console.warn(`[submit] origine refusée : ${origin || '(aucune)'}`)
    return json({ ok: false, error: 'Origine non autorisée.' }, 403)
  }
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Méthode non autorisée.' }, 405, cors)
  }

  try {
    // --- Taille et format du corps (50 ko max) --------------------------
    const { text: raw, tooLarge } = await readBodyLimited(req)
    if (tooLarge) {
      return json({ ok: false, error: 'La requête est trop volumineuse.' }, 413, cors)
    }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ ok: false, error: 'La requête est invalide.' }, 400, cors)
    }
    if (!isPlainObject(body)) {
      return json({ ok: false, error: 'La requête est invalide.' }, 400, cors)
    }

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

    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const ip = clientIp(req)
    const salt = env('RATE_LIMIT_SALT')
    if (!salt) console.warn('[submit] RATE_LIMIT_SALT absent : hachage sans sel')
    const ipHash = await sha256Hex(`${ip}${salt}`)
    if (!(await checkRateLimit(admin, ipHash))) {
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

    const turnstileSecret = env('TURNSTILE_SECRET_KEY')
    if (turnstileSecret && !(await verifyTurnstile(turnstileSecret, body.turnstileToken, ip))) {
      console.warn('[submit] vérification Turnstile échouée')
      return json(
        { ok: false, error: 'La vérification anti-robot a échoué. Merci de réessayer.' },
        403,
        cors,
      )
    }

    // --- Catalogue (y compris inactifs, pour pouvoir les refuser) --------
    const [formules, steps, items, options] = await Promise.all([
      admin.from('formules').select('*'),
      admin.from('steps').select('*'),
      admin.from('items').select('*'),
      admin.from('options').select('*'),
    ])
    const loadError = formules.error ?? steps.error ?? items.error ?? options.error
    if (loadError) throw new Error(`chargement du catalogue : ${loadError.message}`)
    const catalog: Catalog = {
      formules: formules.data ?? [],
      steps: steps.data ?? [],
      items: items.data ?? [],
      options: options.data ?? [],
    }

    // --- Validation + prix recalculé côté serveur -----------------------
    const candidate = pickPayload(body)
    const validation = validateComposition(catalog, candidate)
    if (!validation.ok) {
      return json({ ok: false, errors: validation.errors }, 422, cors)
    }
    const payload = candidate as unknown as CompositionPayload
    const formule = catalog.formules.find((f) => f.id === payload.formuleId)!
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
    const { data: created, error: createError } = await admin.rpc('create_composition', {
      p: {
        formule_id: payload.formuleId,
        couple_names: payload.coupleNames.trim(),
        email: payload.email.trim(),
        phone: typeof payload.phone === 'string' ? payload.phone.trim() : null,
        wedding_date: payload.weddingDate || null,
        guest_count: payload.guestCount,
        total_estimate: estimate.total,
        items: Object.entries(payload.selections).map(([item_id, quantity]) => ({
          item_id,
          quantity,
        })),
        option_ids: payload.optionIds,
      },
    })
    const row = Array.isArray(created) ? created[0] : null
    if (createError || !row) {
      throw new Error(`create_composition : ${createError?.message ?? 'aucune ligne renvoyée'}`)
    }
    const compositionId: string = row.id
    const shareToken: string = row.share_token

    // --- Emails (n'empêchent jamais la réponse : la demande est enregistrée)
    let emailSent = false
    try {
      emailSent = await sendCompositionEmails(admin, compositionId, buildRecap(catalog, formule, payload, estimate))
    } catch (e) {
      console.error(`[submit] envoi des emails (${compositionId}) :`, e)
    }

    return json({ ok: true, compositionId, shareToken, emailSent, estimate }, 200, cors)
  } catch (e) {
    console.error('[submit] erreur inattendue :', e)
    return json({ ok: false, error: GENERIC_ERROR }, 500, cors)
  }
})

// Envoie les deux emails une seule fois par composition (emails_sent_at).
// Renvoie true si l'email récapitulatif du couple est bien parti.
async function sendCompositionEmails(
  admin: ReturnType<typeof createClient>,
  compositionId: string,
  recap: ReturnType<typeof buildRecap>,
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
  if (!apiKey || !from) {
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
    const t = traiteurEmail(recap)
    traiteurOk = await sendEmail({
      apiKey,
      from,
      to: traiteurTo,
      replyTo: recap.email, // le traiteur répond directement au couple
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
    to: recap.email,
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

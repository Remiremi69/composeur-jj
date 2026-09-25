// Edge Function : save-draft
// Sauvegarde côté serveur du menu en cours, pour pouvoir le reprendre et
// relancer les couples qui abandonnent.
//
// • Sans shareToken : CRÉATION d'un brouillon à partir des infos d'accueil
//   (anti-spam complet : honeypot, limite de débit, Turnstile).
//   Réponse : { ok, compositionId, shareToken }.
// • Avec shareToken : MISE À JOUR (état, formule, étape, infos d'accueil),
//   uniquement si la composition est encore un brouillon. Pas de limite de
//   débit (le jeton fait foi), mais taille bornée. Réponse : { ok }.
//
// Validation de structure seulement (types, tailles, identifiants existants) :
// les règles de composition sont vérifiées à l'envoi. Rien n'est jamais
// renvoyé d'autre que ce que le client a lui-même envoyé.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  isShareToken,
  parseDraftCouple,
  parseDraftUpdate,
  sanitizeAttribution,
} from '../_shared/core/draft.ts'
import type { Catalog } from '../_shared/core/types.ts'
import {
  adminClient,
  checkRateLimit,
  GENERIC_ERROR,
  guardRequest,
  ipHashOf,
  isHoneypotFilled,
  json,
  passesTurnstile,
  readJsonObject,
} from '../_shared/guard.ts'

Deno.serve(async (req) => {
  const guard = guardRequest(req, ['POST'])
  if (!guard.ok) return guard.response
  const { cors } = guard

  try {
    const read = await readJsonObject(req, cors)
    if (!read.ok) return read.response
    const { body } = read
    const admin = adminClient()

    return isShareToken(body.shareToken)
      ? await updateDraft(admin, body.shareToken, body, cors)
      : await createDraft(req, admin, body, cors)
  } catch (e) {
    console.error('[save-draft] erreur inattendue :', e)
    return json({ ok: false, error: GENERIC_ERROR }, 500, cors)
  }
})

async function createDraft(
  req: Request,
  admin: SupabaseClient,
  body: Record<string, unknown>,
  cors: Record<string, string>,
): Promise<Response> {
  if (isHoneypotFilled(body)) {
    console.warn('[save-draft] honeypot rempli : création ignorée')
    return json({ ok: true }, 200, cors)
  }
  if (!(await checkRateLimit(admin, await ipHashOf(req), 'draft'))) {
    console.warn('[save-draft] limite de débit atteinte')
    return json({ ok: false, error: 'Trop de tentatives. Merci de réessayer dans une heure.' }, 429, cors)
  }
  if (!(await passesTurnstile(req, body.turnstileToken))) {
    console.warn('[save-draft] vérification Turnstile échouée')
    return json({ ok: false, error: 'La vérification anti-robot a échoué.' }, 403, cors)
  }

  const couple = parseDraftCouple(body.couple)
  if (!couple.ok) return json({ ok: false, errors: couple.errors }, 422, cors)
  const { source, landingParams } = sanitizeAttribution(body.source, body.landingParams)

  const { data, error } = await admin
    .from('compositions')
    .insert({
      status: 'draft',
      couple_names: couple.value.coupleNames,
      email: couple.value.email,
      wedding_date: couple.value.weddingDate,
      guest_count: couple.value.guestCount,
      source,
      landing_params: landingParams,
      last_step: 'formule',
    })
    .select('id, share_token')
    .single()
  if (error || !data) throw new Error(`création du brouillon : ${error?.message ?? 'aucune ligne'}`)

  return json({ ok: true, compositionId: data.id, shareToken: data.share_token }, 200, cors)
}

async function updateDraft(
  admin: SupabaseClient,
  shareToken: string,
  body: Record<string, unknown>,
  cors: Record<string, string>,
): Promise<Response> {
  const catalog = await loadCatalogIds(admin)
  const parsed = parseDraftUpdate(catalog, body)
  if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, 422, cors)
  const u = parsed.value

  const patch: Record<string, unknown> = {}
  if (u.couple) {
    patch.couple_names = u.couple.coupleNames
    patch.email = u.couple.email
    patch.wedding_date = u.couple.weddingDate
    patch.guest_count = u.couple.guestCount
  }
  if (u.formuleId !== undefined) patch.formule_id = u.formuleId
  if (u.lastStep !== undefined) patch.last_step = u.lastStep
  if (u.clientState !== undefined) patch.client_state = u.clientState
  if (Object.keys(patch).length === 0) return json({ ok: true }, 200, cors)

  // Uniquement tant que la composition est un brouillon.
  const { data, error } = await admin
    .from('compositions')
    .update(patch)
    .eq('share_token', shareToken)
    .eq('status', 'draft')
    .select('id')
  if (error) throw new Error(`mise à jour du brouillon : ${error.message}`)
  if (!data || data.length === 0) {
    return json(
      { ok: false, code: 'not_draft', error: 'Ce menu a déjà été envoyé ou n’existe plus.' },
      409,
      cors,
    )
  }
  return json({ ok: true }, 200, cors)
}

// Identifiants du catalogue (y compris inactifs) : suffisent au contrôle de
// structure d'un brouillon.
async function loadCatalogIds(admin: SupabaseClient): Promise<Catalog> {
  const [formules, items, options] = await Promise.all([
    admin.from('formules').select('id'),
    admin.from('items').select('id'),
    admin.from('options').select('id'),
  ])
  const error = formules.error ?? items.error ?? options.error
  if (error) throw new Error(`chargement du catalogue : ${error.message}`)
  return {
    formules: (formules.data ?? []) as Catalog['formules'],
    steps: [],
    items: (items.data ?? []) as Catalog['items'],
    options: (options.data ?? []) as Catalog['options'],
  }
}

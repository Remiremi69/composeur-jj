// Noyau métier partagé — brouillons et attribution.
// Validation de STRUCTURE seulement (types, tailles, identifiants existants) :
// un brouillon est incomplet par nature, les règles de composition ne sont
// vérifiées qu'à l'envoi (validateComposition).

import type { Catalog, ClientState, LandingParams, Selections } from './types.ts'
import { MAX_ITEMS, MAX_OPTIONS, MAX_QUANTITY, validateCoupleInfo } from './validation.ts'

export const MAX_SOURCE_LENGTH = 100
export const MAX_LANDING_VALUE_LENGTH = 200

// Paramètres d'arrivée conservés (liste blanche).
export const LANDING_KEYS = [
  'source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STEP_RE = /^[a-z0-9-]{1,50}$/

// Jeton de partage (UUID) bien formé.
export function isShareToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value)
}

// Identifiant d'étape ou de page (ex : « pieces-cocktail », « recap »).
export function isStepKey(value: unknown): value is string {
  return typeof value === 'string' && STEP_RE.test(value)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t === '' ? null : t
}

// Nettoie la provenance : clés en liste blanche, valeurs tronquées.
// Ne renvoie jamais d'erreur : l'attribution ne doit pas bloquer un couple.
export function sanitizeAttribution(
  source: unknown,
  landingParams: unknown,
): { source: string | null; landingParams: LandingParams | null } {
  const params: LandingParams = {}
  if (isPlainObject(landingParams)) {
    for (const key of LANDING_KEYS) {
      const value = cleanText(landingParams[key], MAX_LANDING_VALUE_LENGTH)
      if (value) params[key] = value
    }
  }
  const cleanSource =
    cleanText(source, MAX_SOURCE_LENGTH) ??
    (params.source ? params.source.slice(0, MAX_SOURCE_LENGTH) : null) ??
    (params.utm_source ? params.utm_source.slice(0, MAX_SOURCE_LENGTH) : null)
  return {
    source: cleanSource,
    landingParams: Object.keys(params).length > 0 ? params : null,
  }
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

export interface DraftCouple {
  coupleNames: string
  email: string
  weddingDate: string | null
  guestCount: number
}

// Informations d'accueil d'un brouillon (mêmes règles qu'à l'accueil).
export function parseDraftCouple(input: unknown, now: Date = new Date()): ParseResult<DraftCouple> {
  if (!isPlainObject(input)) return { ok: false, errors: ['Informations du couple invalides.'] }
  const errors = validateCoupleInfo(input, now)
  if (errors.length > 0) return { ok: false, errors }
  const weddingDate = typeof input.weddingDate === 'string' && input.weddingDate !== '' ? input.weddingDate : null
  return {
    ok: true,
    value: {
      coupleNames: (input.coupleNames as string).trim(),
      email: (input.email as string).trim(),
      weddingDate,
      guestCount: input.guestCount as number,
    },
  }
}

export interface DraftUpdate {
  couple?: DraftCouple // absent = inchangé
  formuleId?: string | null // absent = inchangé
  lastStep?: string | null // absent = inchangé
  clientState?: ClientState // absent = inchangé
}

// Mise à jour d'un brouillon : on ne conserve QUE les champs connus, après
// contrôle de leur forme et de l'existence des identifiants au catalogue.
export function parseDraftUpdate(
  catalog: Catalog,
  body: unknown,
  now: Date = new Date(),
): ParseResult<DraftUpdate> {
  if (!isPlainObject(body)) return { ok: false, errors: ['Données de brouillon invalides.'] }
  const errors: string[] = []
  const value: DraftUpdate = {}

  if (body.couple !== undefined) {
    const couple = parseDraftCouple(body.couple, now)
    if (couple.ok) value.couple = couple.value
    else errors.push(...couple.errors)
  }

  if (body.formuleId !== undefined) {
    if (body.formuleId === null) value.formuleId = null
    else if (typeof body.formuleId === 'string' && catalog.formules.some((f) => f.id === body.formuleId)) {
      value.formuleId = body.formuleId
    } else errors.push('Formule inconnue.')
  }

  if (body.lastStep !== undefined) {
    if (body.lastStep === null) value.lastStep = null
    else if (isStepKey(body.lastStep)) value.lastStep = body.lastStep
    else errors.push('Étape invalide.')
  }

  if (body.clientState !== undefined) {
    const state = parseClientState(catalog, body.clientState)
    if (state.ok) value.clientState = state.value
    else errors.push(...state.errors)
  }

  return errors.length > 0 ? { ok: false, errors: [...new Set(errors)] } : { ok: true, value }
}

function parseClientState(catalog: Catalog, input: unknown): ParseResult<ClientState> {
  if (!isPlainObject(input)) return { ok: false, errors: ['État de composition invalide.'] }
  const errors: string[] = []

  const selections: Selections = {}
  if (!isPlainObject(input.selections)) {
    errors.push('Sélection de plats invalide.')
  } else {
    const itemIds = new Set(catalog.items.map((i) => i.id))
    const entries = Object.entries(input.selections)
    if (entries.length > MAX_ITEMS) errors.push('Sélection de plats invalide.')
    for (const [id, qty] of entries) {
      if (!itemIds.has(id)) errors.push('Plat inconnu.')
      else if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
        errors.push('Quantité invalide.')
      } else selections[id] = qty
    }
  }

  let optionIds: string[] = []
  if (!Array.isArray(input.optionIds) || input.optionIds.length > MAX_OPTIONS) {
    errors.push('Sélection des options invalide.')
  } else {
    const known = new Set(catalog.options.map((o) => o.id))
    if (input.optionIds.some((id) => typeof id !== 'string' || !known.has(id))) {
      errors.push('Option inconnue.')
    } else optionIds = [...new Set(input.optionIds as string[])]
  }

  let currentStep: string | null = null
  if (input.currentStep !== undefined && input.currentStep !== null) {
    if (isStepKey(input.currentStep)) currentStep = input.currentStep
    else errors.push('Étape invalide.')
  }

  return errors.length > 0
    ? { ok: false, errors: [...new Set(errors)] }
    : { ok: true, value: { selections, optionIds, currentStep } }
}

// Retire d'un état sauvegardé ce qui n'est plus proposé (formule, plats ou
// options inactifs ou supprimés). `removed` indique si quelque chose a été ôté.
export function sanitizeState(
  catalog: Pick<Catalog, 'formules' | 'items' | 'options'>,
  state: { formuleId: string | null; selections: Selections; optionIds: string[] },
): { formuleId: string | null; selections: Selections; optionIds: string[]; removed: boolean } {
  let removed = false

  const activeFormules = new Set(catalog.formules.filter((f) => f.is_active === true).map((f) => f.id))
  let formuleId = state.formuleId
  if (formuleId && !activeFormules.has(formuleId)) {
    formuleId = null
    removed = true
  }

  const activeItems = new Set(catalog.items.filter((i) => i.is_active === true).map((i) => i.id))
  const selections: Selections = {}
  for (const [id, qty] of Object.entries(state.selections ?? {})) {
    if (activeItems.has(id)) selections[id] = qty
    else removed = true
  }

  const activeOptions = new Set(catalog.options.filter((o) => o.is_active === true).map((o) => o.id))
  const optionIds = (state.optionIds ?? []).filter((id) => {
    const keep = activeOptions.has(id)
    if (!keep) removed = true
    return keep
  })

  return { formuleId, selections, optionIds, removed }
}

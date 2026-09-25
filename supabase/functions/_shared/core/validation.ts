// Noyau métier partagé — validation d'une composition.
// Exécutée côté serveur (Edge Function) avant tout enregistrement. Les mêmes
// règles servent au front pour prévenir le couple le plus tôt possible.
// Tous les messages sont en français et destinés à être affichés tels quels.

import { evaluateStep, itemsForStep, resolveStep } from './rules.ts'
import type { Catalog, Selections, Step } from './types.ts'

export const GUESTS_MIN = 20
export const GUESTS_MAX = 400
export const MAX_NAMES_LENGTH = 120
export const MAX_EMAIL_LENGTH = 254
export const MAX_PHONE_LENGTH = 30
export const MAX_VENUE_LENGTH = 200
export const MAX_DIETARY_LENGTH = 1000
export const MAX_MESSAGE_LENGTH = 2000
export const MAX_ITEMS = 200
export const MAX_OPTIONS = 50
export const MAX_QUANTITY = 500

export type ValidationResult = { ok: true } | { ok: false; errors: string[] }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(v.trim())
}

// Date du jour au format AAAA-MM-JJ, en UTC. L'UTC est en retard sur l'heure
// française : une date « aujourd'hui » n'est donc jamais rejetée à tort.
export function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10)
}

// Vrai si la chaîne est une date calendaire réelle au format AAAA-MM-JJ.
export function isValidIsoDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === ''
}

export interface CoupleInfoInput {
  coupleNames?: unknown
  email?: unknown
  weddingDate?: unknown
  guestCount?: unknown
}

// Vérifie les informations saisies à l'accueil. Retourne la liste des erreurs.
export function validateCoupleInfo(input: CoupleInfoInput, now: Date = new Date()): string[] {
  const errors: string[] = []

  if (typeof input.coupleNames !== 'string' || input.coupleNames.trim() === '') {
    errors.push('Indiquez vos prénoms.')
  } else if (input.coupleNames.trim().length > MAX_NAMES_LENGTH) {
    errors.push(`Vos prénoms ne doivent pas dépasser ${MAX_NAMES_LENGTH} caractères.`)
  }

  if (!isValidEmail(input.email)) {
    errors.push('Indiquez un email valide.')
  }

  if (
    typeof input.guestCount !== 'number' ||
    !Number.isInteger(input.guestCount) ||
    input.guestCount < GUESTS_MIN ||
    input.guestCount > GUESTS_MAX
  ) {
    errors.push(`Le nombre de convives doit être compris entre ${GUESTS_MIN} et ${GUESTS_MAX}.`)
  }

  if (!isBlank(input.weddingDate)) {
    if (typeof input.weddingDate !== 'string' || !isValidIsoDate(input.weddingDate)) {
      errors.push('La date du mariage est invalide.')
    } else if (input.weddingDate < todayIso(now)) {
      errors.push('La date du mariage est déjà passée.')
    }
  }

  return errors
}

// Normalise un numéro de téléphone. Numéros français → +33XXXXXXXXX
// (06 12 34 56 78, 0612345678, +33 6…, +33 (0)6…, 0033 6…). Numéros
// étrangers acceptés au format international (+32…, +41…, 0032…).
// Renvoie null si le numéro n'est pas exploitable.
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (raw === '' || raw.length > MAX_PHONE_LENGTH) return null
  // Chiffres, espaces, points, tirets, parenthèses et un « + » initial.
  if (!/^\+?[\d\s.()-]+$/.test(raw)) return null
  let digits = raw.replace(/[\s.()-]/g, '')
  if (digits.startsWith('00')) digits = '+' + digits.slice(2)

  if (digits.startsWith('+')) {
    const rest = digits.slice(1)
    if (rest.startsWith('33')) {
      let national = rest.slice(2)
      if (national.startsWith('0')) national = national.slice(1) // « +33 (0)6… »
      return /^[1-9]\d{8}$/.test(national) ? '+33' + national : null
    }
    // Format international (E.164) : indicatif + numéro, 8 à 15 chiffres.
    return /^[1-9]\d{7,14}$/.test(rest) ? '+' + rest : null
  }

  // Numéro national français à 10 chiffres.
  return /^0[1-9]\d{8}$/.test(digits) ? '+33' + digits.slice(1) : null
}

export interface ContactInfoInput {
  phone?: unknown
  venue?: unknown
  dietaryNotes?: unknown
  message?: unknown
}

// Vérifie les informations « Pour vous recontacter » (page récap).
export function validateContactInfo(input: ContactInfoInput): string[] {
  const errors: string[] = []

  if (normalizePhone(input.phone) === null) {
    errors.push('Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).')
  }

  if (typeof input.venue !== 'string' || input.venue.trim() === '') {
    errors.push('Indiquez le lieu de réception.')
  } else if (input.venue.trim().length > MAX_VENUE_LENGTH) {
    errors.push(`Le lieu de réception ne doit pas dépasser ${MAX_VENUE_LENGTH} caractères.`)
  }

  if (!isBlank(input.dietaryNotes)) {
    if (typeof input.dietaryNotes !== 'string' || input.dietaryNotes.length > MAX_DIETARY_LENGTH) {
      errors.push(`Les allergies et régimes ne doivent pas dépasser ${MAX_DIETARY_LENGTH} caractères.`)
    }
  }

  if (!isBlank(input.message)) {
    if (typeof input.message !== 'string' || input.message.length > MAX_MESSAGE_LENGTH) {
      errors.push(`Le message ne doit pas dépasser ${MAX_MESSAGE_LENGTH} caractères.`)
    }
  }

  return errors
}

// Message lisible quand la règle d'une étape n'est pas respectée.
function stepRuleMessage(step: Step, current: number): string {
  const unit = step.unit_label ? ` ${step.unit_label}` : ''
  const chosen = `${current} choisi${current > 1 ? 's' : ''}`
  const min = step.rule_min ?? 0
  const max = step.rule_max
  let rule: string
  switch (step.rule_type) {
    case 'pick_one':
      rule = `choisissez 1${unit}`
      break
    case 'exact_count':
      rule = `il en faut exactement ${min}${unit}`
      break
    case 'pick_range':
    default:
      rule =
        max === null || max === undefined
          ? `choisissez au moins ${min}${unit}`
          : min === max
            ? `choisissez ${max}${unit}`
            : `choisissez entre ${min} et ${max}${unit}`
  }
  return `Étape « ${step.title} » : ${rule} (${chosen}).`
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Valide une composition complète contre le catalogue (y compris éléments
// inactifs, pour pouvoir les refuser). Ne fait confiance à rien de ce qui vient
// du navigateur.
export function validateComposition(
  catalog: Catalog,
  payload: unknown,
  now: Date = new Date(),
): ValidationResult {
  if (!isPlainObject(payload)) {
    return { ok: false, errors: ['Les données envoyées sont invalides.'] }
  }

  const errors: string[] = [...validateCoupleInfo(payload, now), ...validateContactInfo(payload)]

  // Formule
  const formule =
    typeof payload.formuleId === 'string'
      ? catalog.formules.find((f) => f.id === payload.formuleId) ?? null
      : null
  if (!formule || formule.is_active !== true) {
    errors.push("La formule choisie n'est pas disponible.")
  }

  // Sélections : forme générale
  const rawSelections = payload.selections
  let selections: Selections | null = null
  if (!isPlainObject(rawSelections)) {
    errors.push('La sélection de plats est invalide.')
  } else {
    const entries = Object.entries(rawSelections)
    if (entries.length > MAX_ITEMS) {
      errors.push('La sélection de plats est invalide.')
    } else if (
      entries.some(
        ([, q]) =>
          typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > MAX_QUANTITY,
      )
    ) {
      errors.push('La quantité choisie pour un plat est invalide.')
    } else {
      selections = rawSelections as Selections
    }
  }

  // Plats et règles d'étapes (seulement si formule et sélections exploitables)
  if (formule && formule.is_active === true && selections) {
    const included = new Set(formule.included_steps ?? [])
    const stepById = new Map(catalog.steps.map((s) => [s.id, s]))
    const itemById = new Map(catalog.items.map((i) => [i.id, i]))

    for (const [itemId, qty] of Object.entries(selections)) {
      const item = itemById.get(itemId)
      if (!item || item.is_active !== true) {
        errors.push("Un plat choisi n'est plus disponible.")
        continue
      }
      const step = stepById.get(item.step_id)
      if (!step || !included.has(step.slug)) {
        errors.push('Un plat choisi ne fait pas partie de votre formule.')
        continue
      }
      if (step.rule_type !== 'exact_count' && qty !== 1) {
        errors.push('La quantité choisie pour un plat est invalide.')
      }
    }

    const activeItems = catalog.items.filter((i) => i.is_active === true)
    // Dans l'ordre du repas, pour des messages lisibles.
    const orderedSteps = [...catalog.steps].sort((x, y) => x.position - y.position)
    for (const rawStep of orderedSteps) {
      if (!included.has(rawStep.slug) || rawStep.rule_type === 'free') continue
      const step = resolveStep(rawStep, formule)
      const status = evaluateStep(step, itemsForStep(step, activeItems), selections)
      if (!status.satisfied) errors.push(stepRuleMessage(step, status.current))
    }
  }

  // Options
  const rawOptionIds = payload.optionIds ?? []
  if (
    !Array.isArray(rawOptionIds) ||
    rawOptionIds.length > MAX_OPTIONS ||
    rawOptionIds.some((id) => typeof id !== 'string') ||
    new Set(rawOptionIds).size !== rawOptionIds.length
  ) {
    errors.push('La sélection des options est invalide.')
  } else {
    const optionById = new Map(catalog.options.map((o) => [o.id, o]))
    for (const id of rawOptionIds as string[]) {
      const option = optionById.get(id)
      if (!option || option.is_active !== true) {
        errors.push("Une option choisie n'est plus disponible.")
      }
    }
  }

  const unique = [...new Set(errors)]
  return unique.length === 0 ? { ok: true } : { ok: false, errors: unique }
}

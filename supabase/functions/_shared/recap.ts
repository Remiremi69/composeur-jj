// Récapitulatif d'une composition : menu ordonné par étape, options,
// estimation serveur et (pour le traiteur) les infos de recontact.
// Source unique pour le PDF, les emails et la page menu en lecture seule.

import { freeSteps } from './core/journey.ts'
import type { Estimate } from './core/pricing.ts'
import type { Catalog, Formule, Selections } from './core/types.ts'

export { formatEuros as eur, formatPhone } from './core/format.ts'

export interface RecapLine {
  name: string
  description: string | null
  supplement: number
  quantity: number
}

export interface RecapOption {
  name: string
  price: number | null // vide = « Sur demande »
  priceUnit: 'par_personne' | 'forfait'
}

export interface RecapContact {
  email: string
  phone: string
  venue: string
  dietaryNotes: string | null
  message: string | null
}

export interface RecapData {
  coupleNames: string
  weddingDate: string | null
  guestCount: number
  formuleName: string
  sections: { title: string; lines: RecapLine[] }[]
  options: RecapOption[]
  // « Déjà compris dans votre formule » : étapes sans choix (boissons, café…).
  included: { title: string; items: { name: string; description: string | null }[] }[]
  estimate: Estimate
  // Données personnelles : absentes de la page menu partageable.
  contact: RecapContact | null
}

export interface RecapInput {
  coupleNames: string
  weddingDate: string | null
  guestCount: number
  selections: Selections
  optionIds: string[]
  contact?: RecapContact | null
}

export function buildRecap(
  catalog: Catalog,
  formule: Formule | null,
  input: RecapInput,
  estimate: Estimate,
): RecapData {
  const sections: RecapData['sections'] = []
  const steps = [...catalog.steps].sort((a, b) => a.position - b.position)
  for (const step of steps) {
    const lines = catalog.items
      .filter((it) => it.step_id === step.id && (input.selections[it.id] ?? 0) > 0)
      .sort((a, b) => a.position - b.position)
      .map((it) => ({
        name: it.name,
        description: it.description,
        supplement: Number(it.supplement) || 0,
        quantity: input.selections[it.id],
      }))
    if (lines.length) sections.push({ title: step.title, lines })
  }

  const chosen = new Set(input.optionIds)
  const options = catalog.options
    .filter((o) => chosen.has(o.id))
    .sort((a, b) => a.position - b.position)
    .map((o) => ({
      name: o.name,
      price: o.price === null || o.price === undefined ? null : Number(o.price),
      priceUnit: o.price_unit,
    }))

  const included = freeSteps(formule, catalog.steps)
    .map((step) => ({
      title: step.title,
      items: catalog.items
        .filter((it) => it.step_id === step.id && it.is_active === true)
        .sort((a, b) => a.position - b.position)
        .map((it) => ({ name: it.name, description: it.description })),
    }))
    .filter((g) => g.items.length > 0)

  return {
    coupleNames: input.coupleNames.trim(),
    weddingDate: input.weddingDate || null,
    guestCount: input.guestCount,
    formuleName: formule?.name ?? '',
    sections,
    options,
    included,
    estimate,
    contact: input.contact ?? null,
  }
}

// AAAA-MM-JJ → « 19 juin 2027 » (en UTC pour ne pas décaler le jour).
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

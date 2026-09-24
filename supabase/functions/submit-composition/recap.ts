// Récapitulatif d'une composition validée : menu ordonné par étape, options,
// estimation serveur. Source unique pour le PDF et les emails.

import type { Estimate } from '../_shared/core/pricing.ts'
import type { Catalog, CompositionPayload, Formule } from '../_shared/core/types.ts'

export interface RecapLine {
  name: string
  description: string | null
  supplement: number
  quantity: number
}

export interface RecapData {
  coupleNames: string
  email: string
  weddingDate: string | null
  guestCount: number
  formuleName: string
  sections: { title: string; lines: RecapLine[] }[]
  options: { name: string; price: number; priceUnit: 'par_personne' | 'forfait' }[]
  estimate: Estimate
}

export function buildRecap(
  catalog: Catalog,
  formule: Formule,
  payload: CompositionPayload,
  estimate: Estimate,
): RecapData {
  const sections: RecapData['sections'] = []
  const steps = [...catalog.steps].sort((a, b) => a.position - b.position)
  for (const step of steps) {
    const lines = catalog.items
      .filter((it) => it.step_id === step.id && (payload.selections[it.id] ?? 0) > 0)
      .sort((a, b) => a.position - b.position)
      .map((it) => ({
        name: it.name,
        description: it.description,
        supplement: Number(it.supplement) || 0,
        quantity: payload.selections[it.id],
      }))
    if (lines.length) sections.push({ title: step.title, lines })
  }

  const chosen = new Set(payload.optionIds)
  const options = catalog.options
    .filter((o) => chosen.has(o.id))
    .sort((a, b) => a.position - b.position)
    .map((o) => ({ name: o.name, price: Number(o.price) || 0, priceUnit: o.price_unit }))

  return {
    coupleNames: payload.coupleNames.trim(),
    email: payload.email.trim(),
    weddingDate: payload.weddingDate || null,
    guestCount: payload.guestCount,
    formuleName: formule.name,
    sections,
    options,
    estimate,
  }
}

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function eur(n: number): string {
  return eurFormatter.format(n)
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

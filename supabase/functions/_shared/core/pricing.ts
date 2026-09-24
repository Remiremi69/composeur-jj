// Noyau métier partagé — calcul du prix.
// Même calcul côté front (affichage) et côté serveur (enregistrement + emails) :
// le total envoyé par le navigateur n'est jamais utilisé.
//
//   perPersonAllIn = forfait/pers de la formule
//                  + suppléments/pers des plats choisis
//                  + options facturées par personne
//   total          = perPersonAllIn × convives + options au forfait

import type { Formule, Item, Option, Selections } from './types.ts'

export interface Estimate {
  basePerPerson: number // forfait de la formule, par personne
  supplementsPerPerson: number // suppléments des plats choisis, par personne
  optionsPerPerson: number // options facturées par personne
  forfaitOptions: number // options au forfait (montant global)
  perPersonAllIn: number // chiffre affiché partout : tout compris, par personne
  total: number // estimation globale
}

// Les colonnes numeric de Postgres peuvent arriver en nombre ou en texte.
function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

// Arrondi au centime.
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeEstimate(
  formule: Formule | null,
  items: Item[],
  selections: Selections,
  options: Option[],
  optionIds: string[],
  guestCount: number,
): Estimate {
  const guests = Number.isFinite(guestCount) && guestCount > 0 ? Math.floor(guestCount) : 0

  const basePerPerson = toNumber(formule?.price_per_person)

  const supplementsPerPerson = items.reduce(
    (sum, it) => ((selections[it.id] ?? 0) > 0 ? sum + toNumber(it.supplement) : sum),
    0,
  )

  const chosenIds = new Set(optionIds)
  const chosen = options.filter((o) => chosenIds.has(o.id))
  const optionsPerPerson = chosen
    .filter((o) => o.price_unit === 'par_personne')
    .reduce((sum, o) => sum + toNumber(o.price), 0)
  const forfaitOptions = chosen
    .filter((o) => o.price_unit === 'forfait')
    .reduce((sum, o) => sum + toNumber(o.price), 0)

  const perPersonAllIn = basePerPerson + supplementsPerPerson + optionsPerPerson

  return {
    basePerPerson: round2(basePerPerson),
    supplementsPerPerson: round2(supplementsPerPerson),
    optionsPerPerson: round2(optionsPerPerson),
    forfaitOptions: round2(forfaitOptions),
    perPersonAllIn: round2(perPersonAllIn),
    total: round2(perPersonAllIn * guests + forfaitOptions),
  }
}

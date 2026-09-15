import type { Formule, Item, Option, Selections } from '../types/db'

// Modèle de prix J&J : forfait par personne selon la formule,
// + suppléments par personne des plats choisis.
//
//   prix/personne = formule.price_per_person + Σ suppléments choisis
//   total          = prix/personne × nombre de convives

// Somme des suppléments (par personne) des plats sélectionnés.
export function supplementsPerPerson(items: Item[], selections: Selections): number {
  return items.reduce((sum, it) => {
    const qty = selections[it.id] ?? 0
    if (qty <= 0) return sum
    return sum + (it.supplement ?? 0)
  }, 0)
}

// Prix par personne (formule + suppléments).
export function pricePerPerson(
  formule: Formule | null,
  items: Item[],
  selections: Selections,
): number {
  const base = formule?.price_per_person ?? 0
  return base + supplementsPerPerson(items, selections)
}

// Total des options choisies (bar de nuit, en-cas, brunch).
export function optionsTotal(
  options: Option[],
  optionIds: string[],
  guestCount: number,
): number {
  const guests = guestCount > 0 ? guestCount : 0
  return options.reduce((sum, o) => {
    if (!optionIds.includes(o.id)) return sum
    return sum + (o.price_unit === 'par_personne' ? o.price * guests : o.price)
  }, 0)
}

// Estimation totale : menu (formule + suppléments) + options.
export function compositionTotal(
  formule: Formule | null,
  items: Item[],
  selections: Selections,
  guestCount: number,
  options: Option[] = [],
  optionIds: string[] = [],
): number {
  const guests = guestCount > 0 ? guestCount : 0
  const menu = pricePerPerson(formule, items, selections) * guests
  return menu + optionsTotal(options, optionIds, guestCount)
}

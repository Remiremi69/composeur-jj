import type { Item, Selections } from '../types/db'

// Calcul de prix piloté par price_unit. Aucun prix en dur.

// Total d'un plat selon son unité de prix.
export function itemTotal(item: Item, quantity: number, guestCount: number): number {
  const guests = guestCount > 0 ? guestCount : 1
  switch (item.price_unit) {
    case 'par_personne':
      // un plat servi à chaque convive
      return item.price * guests
    case 'par_piece':
      // un prix par pièce, multiplié par les pièces choisies et les convives
      return item.price * quantity * guests
    case 'forfait':
      // prix fixe global (ex : pièce montée)
      return item.price
    default:
      return 0
  }
}

// Estimation totale de la composition.
export function compositionTotal(
  items: Item[],
  selections: Selections,
  guestCount: number,
): number {
  return items.reduce((sum, it) => {
    const qty = selections[it.id] ?? 0
    if (qty <= 0) return sum
    return sum + itemTotal(it, qty, guestCount)
  }, 0)
}

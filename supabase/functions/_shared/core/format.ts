// Noyau métier partagé — formatage des prix.
// Utilisé par le site, les emails et le PDF : un même montant s'affiche
// partout de la même façon.

import type { Option } from './types.ts'

const euros0 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const euros2 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// « 130 € », « 4,50 € », « 134,50 € » : les centimes seulement s'il y en a.
export function formatEuros(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0
  return Number.isInteger(Math.round(n * 100) / 100) ? euros0.format(n) : euros2.format(n)
}

// Numéro normalisé (+33671170673) → affichage lisible (+33 6 71 17 06 73).
export function formatPhone(phone: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone)
  return m ? `+33 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : phone
}

// Libellé du prix d'une option : prix vide = « Sur demande », 0 € = « Offert ».
export function optionPriceLabel(option: Pick<Option, 'price' | 'price_unit'>): string {
  if (option.price === null || option.price === undefined) return 'Sur demande'
  const price = Number(option.price)
  if (!Number.isFinite(price)) return 'Sur demande'
  if (price === 0) return 'Offert'
  return option.price_unit === 'par_personne'
    ? `${formatEuros(price)} / pers`
    : `${formatEuros(price)} forfait`
}

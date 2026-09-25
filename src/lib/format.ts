// Formatage des prix en euros, format français.
// Le prix « normal » vient du noyau partagé : identique au site, aux emails
// et au PDF.
import { formatEuros } from '@core/format'

export { formatPhone, optionPriceLabel } from '@core/format'

const totalFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

// Prix (centimes seulement s'il y en a : « 130 € », « 4,50 € »).
export function formatPrice(amount: number): string {
  return formatEuros(amount)
}

// Gros total / estimation (arrondi à l'euro : "1 800 €").
export function formatTotal(amount: number): string {
  return totalFmt.format(amount)
}

// Libellé lisible de l'unité de prix.
export function priceUnitLabel(unit: string): string {
  switch (unit) {
    case 'par_piece':
      return 'la pièce'
    case 'par_personne':
      return 'par personne'
    case 'forfait':
      return 'forfait'
    default:
      return ''
  }
}

// Allergène brut ("fruits_à_coque") -> libellé lisible ("fruits à coque").
export function formatAllergen(raw: string): string {
  return raw.replace(/_/g, ' ')
}

// Étiquette régime : V / VG / SG -> libellé lisible.
export function dietaryLabel(code: string): string {
  switch (code) {
    case 'V':
      return 'Végétarien'
    case 'VG':
      return 'Végétalien'
    case 'SG':
      return 'Sans gluten'
    default:
      return code
  }
}

// Date ISO -> "12 juin 2026".
export function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

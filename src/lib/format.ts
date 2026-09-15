// Formatage des prix en euros, format français.

const priceFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const totalFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

// Prix unitaire d'un plat (peut avoir des centimes : "2,80 €").
export function formatPrice(amount: number): string {
  return priceFmt.format(amount)
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

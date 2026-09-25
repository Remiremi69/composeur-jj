import { describe, expect, it } from 'vitest'
import { formatEuros, optionPriceLabel } from '@core/format'

// Intl met des espaces insécables (U+00A0 / U+202F) : on les normalise.
const norm = (s: string) => s.replace(/[  ]/g, ' ')

describe('formatEuros', () => {
  it('pas de centimes pour un montant rond', () => {
    expect(norm(formatEuros(130))).toBe('130 €')
    expect(norm(formatEuros(13450))).toBe('13 450 €')
  })
  it('deux décimales dès qu’il y a des centimes', () => {
    expect(norm(formatEuros(4.5))).toBe('4,50 €')
    expect(norm(formatEuros(134.5))).toBe('134,50 €')
  })
})

describe('optionPriceLabel', () => {
  it('prix vide = « Sur demande »', () => {
    expect(optionPriceLabel({ price: null, price_unit: 'forfait' })).toBe('Sur demande')
  })
  it('0 € = « Offert »', () => {
    expect(optionPriceLabel({ price: 0, price_unit: 'par_personne' })).toBe('Offert')
  })
  it('prix par personne ou au forfait', () => {
    expect(norm(optionPriceLabel({ price: 4.5, price_unit: 'par_personne' }))).toBe('4,50 € / pers')
    expect(norm(optionPriceLabel({ price: 250, price_unit: 'forfait' }))).toBe('250 € forfait')
  })
})

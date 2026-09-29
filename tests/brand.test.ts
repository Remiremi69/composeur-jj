// Une seule adresse pour les conditions de mariage, côté site et côté serveur.
import { describe, expect, it } from 'vitest'
import { CONDITIONS_URL, GOOD_TO_KNOW, PRICE_TAX } from '../src/config/brand'
import { BRAND } from '../supabase/functions/_shared/brand.ts'

describe('conditions de mariage', () => {
  it('même adresse sur le site, dans les emails et le PDF', () => {
    expect(BRAND.conditionsUrl).toBe(CONDITIONS_URL)
    expect(CONDITIONS_URL.endsWith(BRAND.conditionsLabel)).toBe(true)
  })

  it('mêmes rappels (20 jours, acomptes) et même mention TTC partout', () => {
    expect([...BRAND.goodToKnow]).toEqual(GOOD_TO_KNOW)
    expect(BRAND.priceTax).toBe(PRICE_TAX)
  })
})

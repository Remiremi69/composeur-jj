import { describe, expect, it } from 'vitest'
import {
  MAX_DIETARY_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_VENUE_LENGTH,
  normalizePhone,
  validateComposition,
  validateContactInfo,
} from '@core/validation'
import { catalog, NOW, validPayload } from './fixtures'

describe('normalizePhone — numéros français', () => {
  it.each([
    ['06 71 17 06 73', '+33671170673'],
    ['0671170673', '+33671170673'],
    ['06.71.17.06.73', '+33671170673'],
    ['06-71-17-06-73', '+33671170673'],
    ['+33 6 71 17 06 73', '+33671170673'],
    ['+33671170673', '+33671170673'],
    ['+33 (0)6 71 17 06 73', '+33671170673'],
    ['0033 6 71 17 06 73', '+33671170673'],
    ['01 23 45 67 89', '+33123456789'],
    ['  06 71 17 06 73  ', '+33671170673'],
  ])('« %s » → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })
})

describe('normalizePhone — numéros étrangers (format international)', () => {
  it.each([
    ['+32 470 12 34 56', '+32470123456'], // Belgique
    ['+41 79 123 45 67', '+41791234567'], // Suisse
    ['0032 470 12 34 56', '+32470123456'],
    ['+44 7911 123456', '+447911123456'], // Royaume-Uni
  ])('« %s » → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })
})

describe('normalizePhone — refus', () => {
  it.each([
    [''],
    ['   '],
    ['06 71 17'], // trop court
    ['06 71 17 06 73 99'], // trop long
    ['6 71 17 06 73'], // sans le 0 initial
    ['+33 06 71 17 06 7'], // +33 incomplet
    ['06 71 17 06 7a'], // lettre
    ['06+71170673'], // « + » au milieu
    ['+1234567'], // international trop court
    ['+0 470 12 34 56'], // indicatif commençant par 0
    ['0612345678; drop table'], // caractères interdits
  ])('refuse « %s »', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })

  it('refuse ce qui n’est pas une chaîne', () => {
    expect(normalizePhone(612345678)).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})

describe('validateContactInfo', () => {
  const ok = { phone: '06 71 17 06 73', venue: 'Domaine des Tilleuls' }

  it('accepte le minimum requis (téléphone + lieu)', () => {
    expect(validateContactInfo(ok)).toEqual([])
  })

  it('exige un téléphone valide', () => {
    expect(validateContactInfo({ ...ok, phone: '' })).toEqual([
      'Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).',
    ])
    expect(validateContactInfo({ ...ok, phone: '123' })).toHaveLength(1)
  })

  it('exige le lieu de réception, borné en longueur', () => {
    expect(validateContactInfo({ ...ok, venue: '  ' })).toEqual(['Indiquez le lieu de réception.'])
    expect(validateContactInfo({ ...ok, venue: 'x'.repeat(MAX_VENUE_LENGTH + 1) })[0]).toMatch(
      /ne doit pas dépasser/,
    )
  })

  it('allergies et message facultatifs mais bornés', () => {
    expect(validateContactInfo({ ...ok, dietaryNotes: '', message: null })).toEqual([])
    expect(
      validateContactInfo({ ...ok, dietaryNotes: 'x'.repeat(MAX_DIETARY_LENGTH + 1) }),
    ).toHaveLength(1)
    expect(validateContactInfo({ ...ok, message: 'x'.repeat(MAX_MESSAGE_LENGTH + 1) })).toHaveLength(1)
  })

  it('validateComposition exige aussi téléphone et lieu', () => {
    const r = validateComposition(catalog, validPayload({ phone: 'abc', venue: '' }), NOW)
    expect(r).toEqual({
      ok: false,
      errors: [
        'Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).',
        'Indiquez le lieu de réception.',
      ],
    })
  })
})

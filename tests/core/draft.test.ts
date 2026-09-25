import { describe, expect, it } from 'vitest'
import {
  isShareToken,
  parseDraftCouple,
  parseDraftUpdate,
  sanitizeAttribution,
  sanitizeState,
} from '@core/draft'
import { catalog, NOW } from './fixtures'

describe('isShareToken', () => {
  it('reconnaît un UUID', () => {
    expect(isShareToken('306c2a9d-4de2-4a83-bd95-8a75d20be2e6')).toBe(true)
  })
  it('refuse le reste', () => {
    for (const v of ['', 'abc', '306c2a9d4de24a83bd958a75d20be2e6', null, 42, "' or 1=1 --"]) {
      expect(isShareToken(v)).toBe(false)
    }
  })
})

describe('sanitizeAttribution', () => {
  it('garde les clés connues, tronque et déduit la source', () => {
    const r = sanitizeAttribution(undefined, {
      utm_source: 'instagram',
      utm_campaign: 'mariage-2027',
      pirate: '<script>',
      utm_medium: 'x'.repeat(500),
    })
    expect(r.source).toBe('instagram')
    expect(r.landingParams).toEqual({
      utm_source: 'instagram',
      utm_campaign: 'mariage-2027',
      utm_medium: 'x'.repeat(200),
    })
  })

  it('priorité au paramètre source explicite', () => {
    expect(sanitizeAttribution('salon-mariage', { utm_source: 'google' }).source).toBe('salon-mariage')
    expect(sanitizeAttribution(null, { source: 'flyer' }).source).toBe('flyer')
  })

  it('ne lève jamais d’erreur sur des données bizarres', () => {
    expect(sanitizeAttribution(42, 'texte')).toEqual({ source: null, landingParams: null })
    expect(sanitizeAttribution(null, [1, 2])).toEqual({ source: null, landingParams: null })
  })
})

describe('parseDraftCouple', () => {
  it('normalise des infos valides', () => {
    const r = parseDraftCouple(
      { coupleNames: '  Camille & Alex ', email: ' a@b.fr ', weddingDate: '', guestCount: 120 },
      NOW,
    )
    expect(r).toEqual({
      ok: true,
      value: { coupleNames: 'Camille & Alex', email: 'a@b.fr', weddingDate: null, guestCount: 120 },
    })
  })
  it('applique les règles de l’accueil', () => {
    expect(parseDraftCouple({ coupleNames: 'A', email: 'x', guestCount: 5 }, NOW).ok).toBe(false)
  })
})

describe('parseDraftUpdate', () => {
  it('ne garde que les champs connus', () => {
    const r = parseDraftUpdate(
      catalog,
      {
        formuleId: 'form-signature',
        lastStep: 'pieces',
        clientState: { selections: { p1: 1 }, optionIds: ['o-bar'], currentStep: 'pieces', pirate: 1 },
        email: 'ignore@moi.fr',
      },
      NOW,
    )
    expect(r).toEqual({
      ok: true,
      value: {
        formuleId: 'form-signature',
        lastStep: 'pieces',
        clientState: { selections: { p1: 1 }, optionIds: ['o-bar'], currentStep: 'pieces' },
      },
    })
  })

  it('refuse des identifiants inconnus', () => {
    expect(parseDraftUpdate(catalog, { formuleId: 'inconnue' }, NOW).ok).toBe(false)
    expect(
      parseDraftUpdate(catalog, { clientState: { selections: { inconnu: 1 }, optionIds: [] } }, NOW).ok,
    ).toBe(false)
    expect(
      parseDraftUpdate(catalog, { clientState: { selections: {}, optionIds: ['inconnue'] } }, NOW).ok,
    ).toBe(false)
  })

  it('refuse des structures invalides', () => {
    expect(parseDraftUpdate(catalog, null, NOW).ok).toBe(false)
    expect(parseDraftUpdate(catalog, { lastStep: '<script>' }, NOW).ok).toBe(false)
    expect(
      parseDraftUpdate(catalog, { clientState: { selections: { p1: 0 }, optionIds: [] } }, NOW).ok,
    ).toBe(false)
    expect(parseDraftUpdate(catalog, { clientState: { selections: [], optionIds: [] } }, NOW).ok).toBe(
      false,
    )
  })

  it('accepte un plat inactif (le nettoyage se fait à la reprise)', () => {
    const r = parseDraftUpdate(
      catalog,
      { clientState: { selections: { 'p-inactif': 1 }, optionIds: [] } },
      NOW,
    )
    expect(r.ok).toBe(true)
  })
})

describe('sanitizeState', () => {
  it('ne change rien si tout est encore proposé', () => {
    const r = sanitizeState(catalog, {
      formuleId: 'form-signature',
      selections: { p1: 1, c1: 1 },
      optionIds: ['o-bar'],
    })
    expect(r).toEqual({
      formuleId: 'form-signature',
      selections: { p1: 1, c1: 1 },
      optionIds: ['o-bar'],
      removed: false,
    })
  })

  it('retire plats, options et formule qui ne sont plus proposés', () => {
    const r = sanitizeState(catalog, {
      formuleId: 'form-ancienne',
      selections: { p1: 1, 'p-inactif': 1, supprime: 1 },
      optionIds: ['o-bar', 'o-inactive', 'supprimee'],
    })
    expect(r).toEqual({
      formuleId: null,
      selections: { p1: 1 },
      optionIds: ['o-bar'],
      removed: true,
    })
  })
})

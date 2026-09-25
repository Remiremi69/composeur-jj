import { describe, expect, it } from 'vitest'
import {
  GUESTS_MAX,
  GUESTS_MIN,
  MAX_NAMES_LENGTH,
  isValidIsoDate,
  validateCoupleInfo,
  validateComposition,
} from '@core/validation'
import { catalog, NOW, validPayload } from './fixtures'

function errorsOf(payload: unknown): string[] {
  const r = validateComposition(catalog, payload, NOW)
  return r.ok ? [] : r.errors
}

describe('validateComposition — cas valide', () => {
  it('accepte une composition conforme', () => {
    expect(validateComposition(catalog, validPayload(), NOW)).toEqual({ ok: true })
  })

  it('accepte une composition sans date ni option', () => {
    expect(errorsOf(validPayload({ weddingDate: null, optionIds: [] }))).toEqual([])
  })

  it('exporte les bornes de convives 20 et 400', () => {
    expect(GUESTS_MIN).toBe(20)
    expect(GUESTS_MAX).toBe(400)
  })
})

describe('validateComposition — données du couple', () => {
  it('refuse une charge utile qui n’est pas un objet', () => {
    expect(errorsOf(null)).toEqual(['Les données envoyées sont invalides.'])
    expect(errorsOf('texte')).toEqual(['Les données envoyées sont invalides.'])
  })

  it('refuse des prénoms vides ou trop longs', () => {
    expect(errorsOf(validPayload({ coupleNames: '   ' }))).toContain('Indiquez vos prénoms.')
    expect(errorsOf(validPayload({ coupleNames: 'a'.repeat(MAX_NAMES_LENGTH + 1) }))[0]).toMatch(
      /ne doivent pas dépasser/,
    )
  })

  it('refuse un email invalide', () => {
    for (const email of ['', 'pas-un-email', 'a@b', 'a b@c.fr', 'a@b.c']) {
      expect(errorsOf(validPayload({ email }))).toContain('Indiquez un email valide.')
    }
  })

  it('borne le nombre de convives entre 20 et 400, en entier', () => {
    const msg = 'Le nombre de convives doit être compris entre 20 et 400.'
    expect(errorsOf(validPayload({ guestCount: 19 }))).toContain(msg)
    expect(errorsOf(validPayload({ guestCount: 401 }))).toContain(msg)
    expect(errorsOf(validPayload({ guestCount: 50.5 }))).toContain(msg)
    expect(errorsOf({ ...validPayload(), guestCount: '100' })).toContain(msg)
    expect(errorsOf(validPayload({ guestCount: 20 }))).toEqual([])
    expect(errorsOf(validPayload({ guestCount: 400 }))).toEqual([])
  })

  it('refuse une date invalide ou passée, accepte aujourd’hui', () => {
    expect(errorsOf(validPayload({ weddingDate: '2027-02-30' }))).toContain(
      'La date du mariage est invalide.',
    )
    expect(errorsOf(validPayload({ weddingDate: '19/06/2027' }))).toContain(
      'La date du mariage est invalide.',
    )
    expect(errorsOf(validPayload({ weddingDate: '2026-09-21' }))).toContain(
      'La date du mariage est déjà passée.',
    )
    expect(errorsOf(validPayload({ weddingDate: '2026-09-22' }))).toEqual([])
  })

  it('validateCoupleInfo sert aussi à l’accueil', () => {
    expect(
      validateCoupleInfo({ coupleNames: 'A & B', email: 'a@b.fr', guestCount: 120 }, NOW),
    ).toEqual([])
    expect(isValidIsoDate('2028-02-29')).toBe(true)
    expect(isValidIsoDate('2027-02-29')).toBe(false)
  })
})

describe('validateComposition — formule, plats et règles', () => {
  it('refuse une formule inconnue ou inactive', () => {
    const msg = "La formule choisie n'est pas disponible."
    expect(errorsOf(validPayload({ formuleId: 'inconnue' }))).toContain(msg)
    expect(errorsOf(validPayload({ formuleId: 'form-ancienne' }))).toContain(msg)
  })

  it('refuse un plat inconnu ou inactif', () => {
    const msg = "Un plat choisi n'est plus disponible."
    const base = validPayload().selections
    expect(errorsOf(validPayload({ selections: { ...base, inconnu: 1 } }))).toContain(msg)
    expect(errorsOf(validPayload({ selections: { ...base, 'p-inactif': 1 } }))).toContain(msg)
  })

  it("refuse un plat d'une étape non incluse dans la formule", () => {
    const base = validPayload().selections
    expect(errorsOf(validPayload({ selections: { ...base, h1: 1 } }))).toContain(
      'Un plat choisi ne fait pas partie de votre formule.',
    )
  })

  it('applique la surcharge de la formule (4 pièces, pas 12)', () => {
    const s = { ...validPayload().selections, p5: 1 } // 5 pièces
    expect(errorsOf(validPayload({ selections: s }))).toEqual([
      'Étape « Vos pièces cocktail » : choisissez 4 pièces (5 choisis).',
    ])
  })

  it('signale une étape pick_one sans choix', () => {
    const { 'f-table': _omit, ...sansFormat } = validPayload().selections
    expect(errorsOf(validPayload({ selections: sansFormat }))).toEqual([
      'Étape « Format de réception » : choisissez 1 format (0 choisi).',
    ])
  })

  it('signale une étape pick_range hors bornes', () => {
    const s = { ...validPayload().selections, c2: 1, c3: 1 } // 3 cocktails pour 1 à 2
    expect(errorsOf(validPayload({ selections: s }))).toEqual([
      'Étape « Votre cocktail » : choisissez entre 1 et 2 cocktails (3 choisis).',
    ])
  })

  it('signale une étape exact_count mal remplie', () => {
    const s = { ...validPayload().selections, m2: 1 } // 5 au lieu de 6
    expect(errorsOf(validPayload({ selections: s }))).toEqual([
      'Étape « Vos mignons » : il en faut exactement 6 pièces (5 choisis).',
    ])
  })

  it('refuse des quantités invalides', () => {
    const msg = 'La quantité choisie pour un plat est invalide.'
    const base = validPayload().selections
    expect(errorsOf(validPayload({ selections: { ...base, c1: 0 } }))).toContain(msg)
    expect(errorsOf(validPayload({ selections: { ...base, c1: 1.5 } }))).toContain(msg)
    // quantité > 1 interdite hors étapes exact_count
    expect(errorsOf(validPayload({ selections: { ...base, c1: 2 } }))).toContain(msg)
  })

  it('refuse des sélections qui ne sont pas un objet', () => {
    expect(errorsOf({ ...validPayload(), selections: ['p1'] })).toContain(
      'La sélection de plats est invalide.',
    )
  })
})

describe('validateComposition — options', () => {
  it('refuse une option inconnue ou inactive', () => {
    const msg = "Une option choisie n'est plus disponible."
    expect(errorsOf(validPayload({ optionIds: ['inconnue'] }))).toContain(msg)
    expect(errorsOf(validPayload({ optionIds: ['o-inactive'] }))).toContain(msg)
  })

  it('refuse une liste d’options mal formée ou avec doublons', () => {
    const msg = 'La sélection des options est invalide.'
    expect(errorsOf({ ...validPayload(), optionIds: 'o-bar' })).toContain(msg)
    expect(errorsOf(validPayload({ optionIds: ['o-bar', 'o-bar'] }))).toContain(msg)
  })
})

describe('erreurs par champ et date proche', () => {
  it('range chaque erreur sous son champ', async () => {
    const { coupleInfoFieldErrors, contactInfoFieldErrors } = await import('@core/validation')
    expect(coupleInfoFieldErrors({ coupleNames: '', email: 'x', guestCount: 5, weddingDate: '2026-01-01' }, NOW)).toEqual({
      coupleNames: 'Indiquez vos prénoms.',
      email: 'Indiquez un email valide.',
      guestCount: 'Le nombre de convives doit être compris entre 20 et 400.',
      weddingDate: 'La date du mariage est déjà passée.',
    })
    expect(contactInfoFieldErrors({ phone: '06 71 17 06 73', venue: '' })).toEqual({
      venue: 'Indiquez le lieu de réception.',
    })
  })

  it('date à moins de 3 mois : avertissement (non bloquant)', async () => {
    const { isDateSoon } = await import('@core/validation')
    expect(isDateSoon('2026-11-15', NOW)).toBe(true)
    expect(isDateSoon('2026-12-23', NOW)).toBe(false)
    expect(isDateSoon('2026-09-21', NOW)).toBe(false) // passée : autre erreur
    expect(isDateSoon('', NOW)).toBe(false)
  })
})

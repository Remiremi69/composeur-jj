import { describe, expect, it } from 'vitest'
import { computeEstimate } from '@core/pricing'
import type { Formule, Item, Option } from '@core/types'
import { items, options, signature } from './fixtures'

describe('computeEstimate', () => {
  it('formule seule : forfait × convives', () => {
    const e = computeEstimate(signature, items, {}, options, [], 100)
    expect(e.basePerPerson).toBe(130)
    expect(e.perPersonAllIn).toBe(130)
    expect(e.total).toBe(13000)
  })

  it('ajoute les suppléments des plats choisis, une fois par plat', () => {
    // p1 a un supplément de 1,50 € ; p2 n'en a pas ; p3 non choisi (quantité 0)
    const e = computeEstimate(signature, items, { p1: 1, p2: 1, p3: 0 }, options, [], 100)
    expect(e.supplementsPerPerson).toBe(1.5)
    expect(e.perPersonAllIn).toBe(131.5)
    expect(e.total).toBe(13150)
  })

  it('options par personne : incluses dans perPersonAllIn', () => {
    const e = computeEstimate(signature, items, {}, options, ['o-soupe'], 100)
    expect(e.optionsPerPerson).toBe(4.5)
    expect(e.forfaitOptions).toBe(0)
    expect(e.perPersonAllIn).toBe(134.5)
    expect(e.total).toBe(13450)
  })

  it('options au forfait : ajoutées une seule fois au total, hors prix par personne', () => {
    const e = computeEstimate(signature, items, {}, options, ['o-bar'], 100)
    expect(e.forfaitOptions).toBe(250)
    expect(e.perPersonAllIn).toBe(130)
    expect(e.total).toBe(13250)
  })

  it('combine suppléments, options par personne et forfait', () => {
    const e = computeEstimate(signature, items, { p1: 1 }, options, ['o-soupe', 'o-bar'], 80)
    expect(e.perPersonAllIn).toBe(136)
    expect(e.total).toBe(136 * 80 + 250)
  })

  it('ignore les options inconnues et compte les doublons une seule fois', () => {
    const e = computeEstimate(signature, items, {}, options, ['o-soupe', 'o-soupe', 'inconnue'], 10)
    expect(e.optionsPerPerson).toBe(4.5)
  })

  it('options par personne : multipliées par le nombre de convives dans le total', () => {
    const e = computeEstimate(signature, items, {}, options, ['o-soupe'], 150)
    expect(e.perPersonAllIn).toBe(134.5)
    expect(e.total).toBe(134.5 * 150)
  })

  it('option « Sur demande » (prix vide) ou « Offerte » (0 €) : ne change pas le prix', () => {
    const e = computeEstimate(signature, items, {}, options, ['o-demande', 'o-offert'], 100)
    expect(e.optionsPerPerson).toBe(0)
    expect(e.forfaitOptions).toBe(0)
    expect(e.perPersonAllIn).toBe(130)
    expect(e.total).toBe(13000)
  })

  it('sans convives : seules les options au forfait comptent', () => {
    expect(computeEstimate(signature, items, {}, options, ['o-bar'], 0).total).toBe(250)
    expect(computeEstimate(signature, items, {}, options, ['o-bar'], -5).total).toBe(250)
  })

  it('sans formule : prix de base nul', () => {
    expect(computeEstimate(null, items, {}, options, [], 100).total).toBe(0)
  })

  it('accepte les montants numeric renvoyés en texte et arrondit au centime', () => {
    const f = { ...signature, price_per_person: '99.99' } as unknown as Formule
    const its = [{ ...items[0], supplement: '0.333' }] as unknown as Item[]
    const opts = [{ ...options[0], price: '1.111' }] as unknown as Option[]
    const e = computeEstimate(f, its, { [its[0].id]: 1 }, opts, [opts[0].id], 3)
    expect(e.perPersonAllIn).toBe(101.43)
  })
})

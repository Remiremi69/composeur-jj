import { describe, expect, it } from 'vitest'
import { evaluateStep, itemsForStep, resolveStep, toggleSelection } from '@core/rules'
import { items, signature, steps } from './fixtures'

const byId = (id: string) => steps.find((s) => s.id === id)!

describe('resolveStep (surcharge par formule)', () => {
  it('applique la surcharge min/max de la formule', () => {
    const resolved = resolveStep(byId('s-pieces'), signature)
    expect(resolved.rule_min).toBe(4)
    expect(resolved.rule_max).toBe(4)
  })

  it("renvoie l'étape inchangée sans surcharge ou sans formule", () => {
    const cocktail = byId('s-cocktail')
    expect(resolveStep(cocktail, signature)).toBe(cocktail)
    expect(resolveStep(cocktail, null)).toBe(cocktail)
  })

  it('ne surcharge que les bornes fournies', () => {
    const f = { ...signature, step_rules: { cocktail: { max: 3 } } }
    const resolved = resolveStep(byId('s-cocktail'), f)
    expect(resolved.rule_min).toBe(1)
    expect(resolved.rule_max).toBe(3)
  })
})

describe('itemsForStep', () => {
  it("ne garde que les plats de l'étape, triés par position", () => {
    expect(itemsForStep(byId('s-format'), items).map((i) => i.id)).toEqual(['f-buffet', 'f-table'])
  })
})

describe('evaluateStep', () => {
  it('pick_one : exige exactement un choix', () => {
    const s = byId('s-format')
    const its = itemsForStep(s, items)
    expect(evaluateStep(s, its, {}).satisfied).toBe(false)
    expect(evaluateStep(s, its, { 'f-table': 1 }).satisfied).toBe(true)
    expect(evaluateStep(s, its, { 'f-table': 1, 'f-buffet': 1 }).satisfied).toBe(false)
  })

  it('pick_range : respecte min et max', () => {
    const s = byId('s-cocktail')
    const its = itemsForStep(s, items)
    expect(evaluateStep(s, its, {}).satisfied).toBe(false)
    expect(evaluateStep(s, its, { c1: 1 }).satisfied).toBe(true)
    const deux = evaluateStep(s, its, { c1: 1, c2: 1 })
    expect(deux.satisfied).toBe(true)
    expect(deux.canAddMore).toBe(false)
    expect(evaluateStep(s, its, { c1: 1, c2: 1, c3: 1 }).satisfied).toBe(false)
  })

  it('pick_range avec surcharge : 4 pièces pour Signature', () => {
    const s = resolveStep(byId('s-pieces'), signature)
    const its = itemsForStep(s, items)
    const quatre = evaluateStep(s, its, { p1: 1, p2: 1, p3: 1, p4: 1 })
    expect(quatre.satisfied).toBe(true)
    expect(quatre.label).toBe('4 / 4 pièces')
    expect(evaluateStep(s, its, { p1: 1, p2: 1, p3: 1 }).satisfied).toBe(false)
  })

  it('exact_count : additionne les quantités', () => {
    const s = byId('s-mignons')
    const its = itemsForStep(s, items)
    expect(evaluateStep(s, its, { m1: 4, m2: 2 }).satisfied).toBe(true)
    expect(evaluateStep(s, its, { m1: 4, m2: 1 }).satisfied).toBe(false)
    expect(evaluateStep(s, its, { m1: 4, m2: 3 }).satisfied).toBe(false)
  })

  it('free : toujours validée', () => {
    const s = byId('s-boissons')
    const status = evaluateStep(s, itemsForStep(s, items), {})
    expect(status.satisfied).toBe(true)
    expect(status.label).toBe('Inclus dans votre formule')
  })
})

describe('toggleSelection', () => {
  it('pick_one : remplace le choix précédent', () => {
    const s = byId('s-format')
    const its = itemsForStep(s, items)
    const buffet = its.find((i) => i.id === 'f-buffet')!
    expect(toggleSelection(s, its, { 'f-table': 1 }, buffet)).toEqual({ 'f-buffet': 1 })
  })

  it("pick_range : n'ajoute pas au-delà du max, retire si déjà choisi", () => {
    const s = byId('s-cocktail')
    const its = itemsForStep(s, items)
    const c3 = its.find((i) => i.id === 'c3')!
    const c1 = its.find((i) => i.id === 'c1')!
    expect(toggleSelection(s, its, { c1: 1, c2: 1 }, c3)).toEqual({ c1: 1, c2: 1 })
    expect(toggleSelection(s, its, { c1: 1, c2: 1 }, c1)).toEqual({ c2: 1 })
  })

  it('exact_count et free : bascule simple', () => {
    const s = byId('s-mignons')
    const its = itemsForStep(s, items)
    const m1 = its.find((i) => i.id === 'm1')!
    expect(toggleSelection(s, its, {}, m1)).toEqual({ m1: 1 })
    expect(toggleSelection(s, its, { m1: 3 }, m1)).toEqual({})
  })
})

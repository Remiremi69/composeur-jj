import { describe, expect, it } from 'vitest'
import { isOptionAvailable, pruneOptionIds, toggleOptionId } from '@core/options'
import { evaluateStep, toggleSelection } from '@core/rules'
import type { Step } from '@core/types'

const step = (slug: string, rule_type: Step['rule_type'], min: number | null, max: number | null): Step => ({
  id: `s-${slug}`, slug, title: slug, subtitle: null, position: 0, rule_type, rule_min: min, rule_max: max, unit_label: 'brunch',
})
const steps = [step('brunch', 'pick_range', 0, 1), step('fromage', 'free', null, null)]
const items = [
  { id: 'petit-dej', step_id: 's-brunch' },
  { id: 'trilogie', step_id: 's-fromage' },
]
const options = [
  { id: 'install', category: 'brunch', exclusive_group: 'mise-en-place' },
  { id: 'service', category: 'brunch', exclusive_group: 'mise-en-place' },
  { id: 'plateau', category: 'fromage', exclusive_group: null },
  { id: 'bar', category: 'bar-de-nuit', exclusive_group: null },
]

describe('options exclusives', () => {
  it('cocher une option retire les autres du même groupe, sans toucher aux autres', () => {
    expect(toggleOptionId(options, ['install', 'bar'], 'service')).toEqual(['bar', 'service'])
    expect(toggleOptionId(options, ['service'], 'service')).toEqual([])
    expect(toggleOptionId(options, ['plateau'], 'bar')).toEqual(['plateau', 'bar'])
  })
})

describe('options rattachées à une étape', () => {
  it('la mise en place du brunch exige un brunch choisi', () => {
    expect(isOptionAvailable(options[0], steps, items, {})).toBe(false)
    expect(isOptionAvailable(options[0], steps, items, { 'petit-dej': 1 })).toBe(true)
  })

  it('étape sans choix (fromage) et options de la page finale : toujours possibles', () => {
    expect(isOptionAvailable(options[2], steps, items, {})).toBe(true)
    expect(isOptionAvailable(options[3], steps, items, {})).toBe(true)
  })

  it('retirer le brunch retire sa mise en place ; doublons exclusifs réduits à la dernière', () => {
    expect(pruneOptionIds(options, steps, items, {}, ['install', 'bar', 'plateau'])).toEqual(['bar', 'plateau'])
    expect(pruneOptionIds(options, steps, items, { 'petit-dej': 1 }, ['install', 'service'])).toEqual(['service'])
  })
})

describe('étape facultative (0 ou 1 choix)', () => {
  it('valide sans choix, libellé explicite', () => {
    const brunch = steps[0]
    expect(evaluateStep(brunch, [], {})).toMatchObject({ satisfied: true, label: 'Facultatif : 1 brunch au choix' })
    const one = evaluateStep(brunch, [{ id: 'petit-dej' } as never], { 'petit-dej': 1 })
    expect(one).toMatchObject({ satisfied: true, label: 'Votre choix est fait', canAddMore: false })
  })

  it('un seul choix possible : un autre format remplace le premier, et on peut tout décocher', () => {
    const brunch = steps[0]
    const formats = [{ id: 'petit-dej' }, { id: 'machon' }] as never[]
    const a = toggleSelection(brunch, formats, { 'petit-dej': 1 }, { id: 'machon' } as never)
    expect(a).toEqual({ machon: 1 })
    expect(toggleSelection(brunch, formats, a, { id: 'machon' } as never)).toEqual({})
  })
})

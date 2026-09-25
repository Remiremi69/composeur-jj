import { describe, expect, it } from 'vitest'
import {
  buildScreens,
  entryScreenSlug,
  firstInvalidIndex,
  freeSteps,
  resolveComposerRoute,
  screenIndexForKey,
  screenStatus,
} from '@core/journey'
import type { Formule, Item, Step } from '@core/types'

function step(slug: string, position: number, extra: Partial<Step> = {}): Step {
  return {
    id: `s-${slug}`,
    slug,
    title: `Titre ${slug}`,
    subtitle: null,
    position,
    rule_type: 'pick_one',
    rule_min: 1,
    rule_max: 1,
    unit_label: null,
    ...extra,
  }
}

function item(id: string, stepSlug: string): Item {
  return {
    id,
    step_id: `s-${stepSlug}`,
    name: id,
    description: null,
    photo_url: null,
    price: 0,
    price_unit: 'par_personne',
    supplement: 0,
    labels: [],
    category: null,
    allergens: [],
    is_seasonal: false,
    season_note: null,
    is_active: true,
    position: 0,
  }
}

const steps: Step[] = [
  step('format', 0, { nav_title: 'Format' }),
  step('boissons', 1, { rule_type: 'free', rule_min: null, rule_max: null }),
  step('pieces', 2, { rule_type: 'pick_range', rule_min: 12, rule_max: 12, nav_title: 'Pièces' }),
  step('plat', 3, { group_slug: 'assiette', group_title: 'Votre assiette', group_nav_title: 'Assiette' }),
  step('feculent', 4, { group_slug: 'assiette', group_title: 'Votre assiette', group_nav_title: 'Assiette' }),
  step('legume', 5, { group_slug: 'assiette', group_title: 'Votre assiette', group_nav_title: 'Assiette' }),
  step('cafe', 6, { rule_type: 'free', rule_min: null, rule_max: null }),
  step('dessert', 7),
  step('hors-formule', 8),
]

const formule: Formule = {
  id: 'f',
  slug: 'signature',
  name: 'Signature',
  subtitle: null,
  price_per_person: 130,
  included_steps: ['format', 'boissons', 'pieces', 'plat', 'feculent', 'legume', 'cafe', 'dessert'],
  highlights: [],
  step_rules: { pieces: { min: 2, max: 2 } },
  position: 1,
  is_active: true,
}

const items: Item[] = [
  item('f1', 'format'),
  item('p1', 'pieces'),
  item('p2', 'pieces'),
  item('pl1', 'plat'),
  item('fe1', 'feculent'),
  item('le1', 'legume'),
  item('d1', 'dessert'),
]

const screens = buildScreens(formule, steps)

describe('buildScreens', () => {
  it('écarte les étapes « incluses » et celles hors formule', () => {
    expect(screens.map((s) => s.slug)).toEqual(['format', 'pieces', 'assiette', 'dessert'])
  })

  it('regroupe les étapes d’un même group_slug sur un seul écran', () => {
    const assiette = screens[2]
    expect(assiette.title).toBe('Votre assiette')
    expect(assiette.navTitle).toBe('Assiette')
    expect(assiette.steps.map((s) => s.slug)).toEqual(['plat', 'feculent', 'legume'])
  })

  it('noms courts avec repli sur le titre complet', () => {
    expect(screens[0].navTitle).toBe('Format')
    expect(screens[3].navTitle).toBe('Titre dessert')
  })

  it('applique les règles propres à la formule', () => {
    expect(screens[1].steps[0].rule_max).toBe(2)
  })

  it('liste les étapes « déjà comprises »', () => {
    expect(freeSteps(formule, steps).map((s) => s.slug)).toEqual(['boissons', 'cafe'])
  })
})

describe('validation des écrans', () => {
  it('un écran groupé n’est valide que si toutes ses sections le sont', () => {
    expect(screenStatus(screens[2], items, { pl1: 1, fe1: 1 }).valid).toBe(false)
    expect(screenStatus(screens[2], items, { pl1: 1, fe1: 1, le1: 1 }).valid).toBe(true)
  })

  it('premier écran non validé', () => {
    expect(firstInvalidIndex(screens, items, {})).toBe(0)
    expect(firstInvalidIndex(screens, items, { f1: 1 })).toBe(1)
    expect(firstInvalidIndex(screens, items, { f1: 1, p1: 1, p2: 1, pl1: 1, fe1: 1, le1: 1, d1: 1 })).toBe(4)
  })

  it('retrouve l’écran d’une étape groupée', () => {
    expect(screenIndexForKey(screens, 'feculent')).toBe(2)
    expect(screenIndexForKey(screens, 'inconnue')).toBe(-1)
  })
})

describe('resolveComposerRoute', () => {
  const done = { f1: 1, p1: 1, p2: 1 }

  it('autorise un écran accessible', () => {
    expect(resolveComposerRoute(screens, 'assiette', items, done)).toEqual({ kind: 'ok', index: 2 })
    expect(resolveComposerRoute(screens, 'format', items, done)).toEqual({ kind: 'ok', index: 0 })
  })

  it('redirige un accès direct à un écran pas encore autorisé', () => {
    expect(resolveComposerRoute(screens, 'dessert', items, { f1: 1 })).toEqual({
      kind: 'redirect',
      slug: 'pieces',
    })
  })

  it('redirige une clé inconnue vers le premier écran', () => {
    expect(resolveComposerRoute(screens, 'nimporte', items, done)).toEqual({
      kind: 'redirect',
      slug: 'format',
    })
  })

  it('renvoie le slug d’une étape groupée vers l’adresse du groupe', () => {
    expect(resolveComposerRoute(screens, 'legume', items, done)).toEqual({
      kind: 'redirect',
      slug: 'assiette',
    })
  })
})

describe('entryScreenSlug (/composer sans étape)', () => {
  const all = { f1: 1, p1: 1, p2: 1, pl1: 1, fe1: 1, le1: 1, d1: 1 }

  it('reprend à la dernière étape visitée', () => {
    expect(entryScreenSlug(screens, steps, 'assiette', items, all)).toBe('assiette')
  })

  it('premier écran sans historique', () => {
    expect(entryScreenSlug(screens, steps, null, items, {})).toBe('format')
    expect(entryScreenSlug(screens, steps, 'formule', items, all)).toBe('format')
  })

  it('ne dépasse jamais le premier écran non validé', () => {
    expect(entryScreenSlug(screens, steps, 'dessert', items, { f1: 1 })).toBe('pieces')
  })

  it('anciens brouillons : étape « incluse » → écran suivant, options → dernier écran', () => {
    expect(entryScreenSlug(screens, steps, 'boissons', items, all)).toBe('pieces')
    expect(entryScreenSlug(screens, steps, 'plat', items, all)).toBe('assiette')
    expect(entryScreenSlug(screens, steps, 'options', items, all)).toBe('dessert')
  })
})

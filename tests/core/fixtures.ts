// Catalogue de test : couvre chaque type de règle, une surcharge de formule,
// des éléments inactifs et les deux modes de prix des options.
import type { Catalog, CompositionPayload, Formule, Item, Option, Step } from '@core/types'

export const NOW = new Date('2026-09-22T12:00:00Z')

function step(id: string, slug: string, rule: Partial<Step>): Step {
  return {
    id,
    slug,
    title: `Titre ${slug}`,
    subtitle: null,
    position: 0,
    rule_type: 'free',
    rule_min: null,
    rule_max: null,
    unit_label: null,
    ...rule,
  }
}

function item(id: string, stepId: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    step_id: stepId,
    name: `Plat ${id}`,
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
    ...extra,
  }
}

export const steps: Step[] = [
  step('s-format', 'format', { title: 'Format de réception', position: 0, rule_type: 'pick_one', rule_min: 1, rule_max: 1, unit_label: 'format' }),
  step('s-boissons', 'boissons', { title: 'Vos boissons', position: 1, rule_type: 'free' }),
  step('s-pieces', 'pieces', { title: 'Vos pièces cocktail', position: 2, rule_type: 'pick_range', rule_min: 12, rule_max: 12, unit_label: 'pièces' }),
  step('s-cocktail', 'cocktail', { title: 'Votre cocktail', position: 3, rule_type: 'pick_range', rule_min: 1, rule_max: 2, unit_label: 'cocktails' }),
  step('s-mignons', 'mignons', { title: 'Vos mignons', position: 4, rule_type: 'exact_count', rule_min: 6, unit_label: 'pièces' }),
  step('s-hors', 'hors-formule', { title: 'Hors formule', position: 5, rule_type: 'pick_one', rule_min: 1, rule_max: 1 }),
]

export const items: Item[] = [
  item('f-table', 's-format', { position: 2 }),
  item('f-buffet', 's-format', { position: 1 }),
  item('b-eau', 's-boissons'),
  ...['p1', 'p2', 'p3', 'p4', 'p5'].map((id, i) => item(id, 's-pieces', { position: i, supplement: id === 'p1' ? 1.5 : 0 })),
  item('p-inactif', 's-pieces', { is_active: false }),
  item('c1', 's-cocktail'),
  item('c2', 's-cocktail'),
  item('c3', 's-cocktail'),
  item('m1', 's-mignons'),
  item('m2', 's-mignons'),
  item('h1', 's-hors'),
]

export const signature: Formule = {
  id: 'form-signature',
  slug: 'signature',
  name: 'Signature',
  subtitle: null,
  price_per_person: 130,
  included_steps: ['format', 'boissons', 'pieces', 'cocktail', 'mignons'],
  highlights: [],
  step_rules: { pieces: { min: 4, max: 4 } },
  position: 1,
  is_active: true,
}

export const ancienne: Formule = { ...signature, id: 'form-ancienne', slug: 'ancienne', is_active: false }

export const options: Option[] = [
  { id: 'o-soupe', slug: 'soupe', category: 'en-cas', name: 'Soupe', description: null, price: 4.5, price_unit: 'par_personne', position: 1, is_active: true },
  { id: 'o-bar', slug: 'bar', category: 'bar-de-nuit', name: 'Bar de nuit', description: null, price: 250, price_unit: 'forfait', position: 2, is_active: true },
  { id: 'o-inactive', slug: 'vieille', category: 'en-cas', name: 'Ancienne option', description: null, price: 10, price_unit: 'forfait', position: 3, is_active: false },
  { id: 'o-demande', slug: 'buffet-gateaux', category: 'dessert', name: 'Buffet des gâteaux', description: null, price: null, price_unit: 'forfait', position: 4, is_active: true },
  { id: 'o-offert', slug: 'offert', category: 'services', name: 'Mise en place', description: null, price: 0, price_unit: 'forfait', position: 5, is_active: true },
]

export const catalog: Catalog = { formules: [signature, ancienne], steps, items, options }

// Composition valide pour Signature : 1 format, 4 pièces, 1 cocktail, 6 mignons.
export function validPayload(overrides: Partial<CompositionPayload> = {}): CompositionPayload {
  return {
    coupleNames: 'Camille & Alex',
    email: 'camille@exemple.fr',
    weddingDate: '2027-06-19',
    guestCount: 100,
    formuleId: 'form-signature',
    selections: { 'f-table': 1, p1: 1, p2: 1, p3: 1, p4: 1, c1: 1, m1: 4, m2: 2 },
    optionIds: ['o-soupe', 'o-bar'],
    phone: '06 71 17 06 73',
    venue: 'Domaine des Tilleuls, Saint-Cyr',
    dietaryNotes: '3 végétariens, 1 sans gluten',
    message: null,
    ...overrides,
  }
}

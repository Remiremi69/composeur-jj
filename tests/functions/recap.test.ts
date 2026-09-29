import { describe, expect, it } from 'vitest'
import { buildRecap } from '../../supabase/functions/_shared/recap.ts'
import type { Catalog, Formule, Item, Step } from '../../supabase/functions/_shared/core/types.ts'

const step = (slug: string, position: number, rule_type: Step['rule_type']): Step => ({
  id: `s-${slug}`, slug, title: `Titre ${slug}`, subtitle: null, position, rule_type,
  rule_min: rule_type === 'free' ? null : 1, rule_max: rule_type === 'free' ? null : 1, unit_label: null,
})
const item = (id: string, stepSlug: string): Item => ({
  id, step_id: `s-${stepSlug}`, name: `Plat ${id}`, description: null, photo_url: null, price: 0,
  price_unit: 'par_personne', supplement: 0, labels: [], category: null, allergens: [],
  is_seasonal: false, season_note: null, is_active: true, position: 0,
})

describe('récapitulatif serveur', () => {
  it('une étape sans choix n’apparaît que dans « Déjà compris », même si un ancien choix subsiste', () => {
    const catalog: Catalog = {
      formules: [],
      steps: [step('plat', 1, 'pick_one'), step('fromage', 2, 'free')],
      items: [item('p1', 'plat'), item('fr1', 'fromage'), item('fr2', 'fromage')],
      options: [],
    }
    const formule = { id: 'f', included_steps: ['plat', 'fromage'], step_rules: null } as unknown as Formule
    const estimate = { basePerPerson: 0, supplementsPerPerson: 0, optionsPerPerson: 0, forfaitOptions: 0, perPersonAllIn: 0, total: 0 }
    // fr1 : choix fait avant que le fromage devienne « compris »
    const recap = buildRecap(catalog, formule, { coupleNames: 'A', weddingDate: null, guestCount: 80, selections: { p1: 1, fr1: 1 }, optionIds: [] }, estimate)
    expect(recap.sections.map((s) => s.title)).toEqual(['Titre plat'])
    expect(recap.included).toEqual([
      { title: 'Titre fromage', items: [{ name: 'Plat fr1', description: null }, { name: 'Plat fr2', description: null }] },
    ])
  })
})

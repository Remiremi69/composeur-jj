import { describe, expect, it } from 'vitest'
import {
  averageFirstContactHours,
  basketComparison,
  conversionBySource,
  funnel,
  furthestStage,
  inTab,
  lastStepLabel,
  lostReasons,
  matchesSearch,
  requestsCsv,
  sortRequests,
  toCsv,
  whatsappHref,
} from '../src/lib/crm'
import type { Composition, CompositionNote, CrmStatus } from '../src/types/db'
import type { Step } from '@core/types'

const NOW = new Date('2026-09-28T12:00:00Z').getTime()
const daysAgo = (d: number) => new Date(NOW - d * 86400_000).toISOString()

let seq = 0
function comp(extra: Partial<Composition> = {}): Composition {
  seq++
  return {
    id: `c${seq}`,
    created_at: daysAgo(5),
    formule_id: 'f1',
    couple_names: `Couple ${seq}`,
    email: `c${seq}@exemple.fr`,
    phone: '+33612345678',
    wedding_date: '2027-06-19',
    guest_count: 100,
    status: 'submitted',
    total_estimate: 13000,
    handled: false,
    share_token: `t${seq}`,
    emails_sent_at: null,
    updated_at: daysAgo(5),
    venue: null,
    dietary_notes: null,
    message: null,
    source: null,
    landing_params: null,
    last_step: null,
    reminder_sent_at: null,
    reminders_opt_out: false,
    consent_at: daysAgo(4),
    crm_status: 'nouveau',
    lost_reason: null,
    contacted_at: null,
    estimate: null,
    is_test: false,
    ...extra,
  }
}

function statusNote(c: Composition, from: CrmStatus, to: CrmStatus): CompositionNote {
  return {
    id: `n-${c.id}-${to}`,
    composition_id: c.id,
    author_id: null,
    author_email: null,
    kind: 'statut',
    body: null,
    from_status: from,
    to_status: to,
    created_at: daysAgo(1),
  }
}

describe('entonnoir : étape la plus avancée jamais atteinte', () => {
  it('une demande passée par « dégustation » puis « perdu » compte dans les dégustations', () => {
    const c = comp({ crm_status: 'perdu', lost_reason: 'prix', contacted_at: daysAgo(3) })
    const notes = [statusNote(c, 'nouveau', 'contacte'), statusNote(c, 'contacte', 'degustation'), statusNote(c, 'degustation', 'perdu')]
    expect(furthestStage(c, notes)).toBe(2)
    const f = funnel([c], notes, 30, NOW)
    expect(f.find((s) => s.key === 'degustations')?.count).toBe(1)
    expect(f.find((s) => s.key === 'contactes')?.count).toBe(1)
    expect(f.find((s) => s.key === 'signes')?.count).toBe(0)
  })

  it('perdue sans être passée par la dégustation : ne compte pas dans les dégustations', () => {
    const c = comp({ crm_status: 'perdu', lost_reason: 'sans_reponse' })
    const notes = [statusNote(c, 'nouveau', 'perdu')]
    expect(funnel([c], notes, 30, NOW).find((s) => s.key === 'degustations')?.count).toBe(0)
  })

  it('l’historique d’une autre demande n’est jamais pris en compte', () => {
    const a = comp()
    const b = comp()
    expect(furthestStage(a, [statusNote(b, 'nouveau', 'signe')])).toBe(0)
  })

  it('étapes, taux de passage, période et exclusion des tests', () => {
    const list = [
      comp({ status: 'draft', consent_at: null }),
      comp({ status: 'draft', consent_at: null }),
      comp(),
      comp({ crm_status: 'contacte', contacted_at: daysAgo(3) }),
      comp({ crm_status: 'signe', contacted_at: daysAgo(3) }),
      comp({ created_at: daysAgo(60) }), // hors période de 30 jours
      comp({ is_test: true }), // test : ignoré
    ]
    const f30 = funnel(list, [], 30, NOW)
    expect(f30.map((s) => s.count)).toEqual([5, 3, 2, 1, 1])
    expect(f30[1].rate).toBeCloseTo(3 / 5)
    expect(f30[0].rate).toBeNull()
    expect(funnel(list, [], 90, NOW)[0].count).toBe(6)
  })
})

describe('statistiques', () => {
  it('délai moyen de premier contact (heures), demandes sans date ignorées', () => {
    const list = [
      comp({ consent_at: '2026-09-20T10:00:00Z', contacted_at: '2026-09-20T12:00:00Z' }),
      comp({ consent_at: '2026-09-20T10:00:00Z', contacted_at: '2026-09-21T10:00:00Z' }),
      comp({ crm_status: 'contacte', contacted_at: null }), // reprise de l'ancien « traité »
      comp({ consent_at: '2026-09-20T10:00:00Z', contacted_at: '2026-09-20T11:00:00Z', is_test: true }),
    ]
    expect(averageFirstContactHours(list)).toEqual({ hours: 13, count: 2 })
    expect(averageFirstContactHours([comp()])).toBeNull()
  })

  it('conversion par source', () => {
    const list = [
      comp({ source: 'instagram', crm_status: 'signe' }),
      comp({ source: 'instagram' }),
      comp({ source: null }),
      comp({ source: 'instagram', is_test: true, crm_status: 'signe' }),
    ]
    expect(conversionBySource(list)).toEqual([
      { source: 'instagram', sent: 2, signed: 1, rate: 0.5 },
      { source: 'Direct / inconnue', sent: 1, signed: 0, rate: 0 },
    ])
  })

  it('panier par personne : signés comparés à tous les envoyés (détail figé prioritaire)', () => {
    const list = [
      comp({ total_estimate: 10000, guest_count: 100 }), // 100 €/pers
      comp({ crm_status: 'signe', total_estimate: 15000, guest_count: 100 }), // 150
      comp({ crm_status: 'signe', estimate: { basePerPerson: 120, supplementsPerPerson: 0, optionsPerPerson: 0, forfaitOptions: 0, perPersonAllIn: 170, total: 17000 } }),
      comp({ status: 'draft' }),
    ]
    expect(basketComparison(list)).toEqual({ all: 140, signed: 160 })
  })

  it('motifs de perte', () => {
    const list = [
      comp({ crm_status: 'perdu', lost_reason: 'prix' }),
      comp({ crm_status: 'perdu', lost_reason: 'prix' }),
      comp({ crm_status: 'perdu', lost_reason: 'autre_traiteur' }),
    ]
    expect(lostReasons(list)).toEqual([
      { reason: 'Prix', count: 2 },
      { reason: 'Autre traiteur', count: 1 },
    ])
  })
})

describe('liste des demandes', () => {
  it('onglets', () => {
    expect(inTab(comp({ crm_status: 'degustation' }), 'en_cours')).toBe(true)
    expect(inTab(comp({ crm_status: 'nouveau' }), 'nouveaux')).toBe(true)
    expect(inTab(comp({ status: 'draft' }), 'brouillons')).toBe(true)
    expect(inTab(comp({ status: 'draft' }), 'nouveaux')).toBe(false)
  })

  it('recherche par prénoms ou email, sans accents ni majuscules', () => {
    const c = comp({ couple_names: 'Léa & Thomas', email: 'lea.thomas@exemple.fr' })
    expect(matchesSearch(c, 'lea')).toBe(true)
    expect(matchesSearch(c, 'THOMAS@')).toBe(true)
    expect(matchesSearch(c, 'julien')).toBe(false)
  })

  it('tri par date de mariage (plus proche d’abord, sans date à la fin) et de réception', () => {
    const a = comp({ wedding_date: '2027-09-01', consent_at: daysAgo(1) })
    const b = comp({ wedding_date: null, consent_at: daysAgo(3) })
    const c = comp({ wedding_date: '2027-05-01', consent_at: daysAgo(2) })
    expect(sortRequests([a, b, c], 'mariage').map((x) => x.id)).toEqual([c.id, a.id, b.id])
    expect(sortRequests([a, b, c], 'reception').map((x) => x.id)).toEqual([a.id, c.id, b.id])
  })

  it('export CSV : BOM, « ; », guillemets échappés', () => {
    const csv = toCsv(['A', 'B'], [['x;y', 'dit "oui"'], [null, 3]])
    expect(csv).toBe('\uFEFFA;B\r\n"x;y";"dit ""oui"""\r\n;3\r\n')
    const full = requestsCsv([comp({ couple_names: 'Léa & Thomas', crm_status: 'perdu', lost_reason: 'prix' })], [], [], 'perdus')
    expect(full).toContain('Léa & Thomas')
    expect(full).toContain(';Perdu;Prix;')
  })

  it('étape atteinte d’un brouillon (écran groupé compris) et lien WhatsApp', () => {
    const steps = [
      { slug: 'plat', title: 'Votre plat', nav_title: 'Plat', group_slug: 'assiette', group_title: 'Votre assiette', group_nav_title: 'Assiette' },
    ] as Step[]
    expect(lastStepLabel('assiette', steps)).toBe('Assiette')
    expect(lastStepLabel('plat', steps)).toBe('Plat')
    expect(lastStepLabel('recap', steps)).toBe('Récapitulatif')
    expect(whatsappHref('+33 6 12 34 56 78')).toBe('https://wa.me/33612345678')
  })
})

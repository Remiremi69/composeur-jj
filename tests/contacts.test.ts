import { describe, expect, it } from 'vitest'
import {
  CONTACT_ORIGINS,
  configuratorLink,
  duplicateIds,
  findDuplicates,
  generalLink,
  homeCounters,
  inView,
  inviteMessage,
  isOverdue,
  isWithoutMenu,
  mailtoHref,
  receivedAgo,
  smsHref,
  sortForView,
  sourceLabel,
  whatsappMessageHref,
} from '../src/lib/contacts'
import type { Composition, CompositionNote } from '../src/types/db'

const NOW = new Date('2026-10-26T10:00:00Z').getTime()
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString()

let seq = 0
function comp(extra: Partial<Composition> = {}): Composition {
  seq++
  return {
    id: `c${seq}`,
    created_at: hoursAgo(10),
    formule_id: 'f1',
    couple_names: `Couple ${seq}`,
    email: `c${seq}@exemple.fr`,
    phone: `+3361234${String(seq).padStart(4, '0')}`,
    wedding_date: '2027-06-19',
    guest_count: 100,
    status: 'submitted',
    total_estimate: 13000,
    handled: false,
    share_token: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    emails_sent_at: null,
    updated_at: hoursAgo(10),
    venue: null,
    dietary_notes: null,
    message: null,
    source: null,
    landing_params: null,
    last_step: null,
    reminder_sent_at: null,
    reminders_opt_out: false,
    consent_at: hoursAgo(9),
    crm_status: 'nouveau',
    lost_reason: null,
    contacted_at: null,
    estimate: null,
    is_test: false,
    ajout_manuel: false,
    ...extra,
  }
}

// Contact ajouté à la main, sans menu.
const manual = (extra: Partial<Composition> = {}) =>
  comp({ ajout_manuel: true, consent_at: null, formule_id: null, total_estimate: null, reminders_opt_out: true, source: 'salon', ...extra })

function signedNote(c: Composition, at: string): CompositionNote {
  return { id: `n-${c.id}-${at}`, composition_id: c.id, author_id: null, author_email: null, kind: 'statut', body: null, from_status: 'devis_envoye', to_status: 'signe', created_at: at }
}

describe('fiche sans menu', () => {
  it('contact ajouté à la main sans menu envoyé', () => {
    expect(isWithoutMenu(manual())).toBe(true)
  })
  it('le même contact une fois le menu envoyé par le couple', () => {
    expect(isWithoutMenu(manual({ consent_at: hoursAgo(1), formule_id: 'f1' }))).toBe(false)
  })
  it('une demande arrivée par le site a toujours un menu', () => {
    expect(isWithoutMenu(comp())).toBe(false)
    // anciennes demandes (lot 1) sans date de consentement
    expect(isWithoutMenu(comp({ consent_at: null }))).toBe(false)
  })
})

describe('liens et messages', () => {
  const base = 'https://composer.j-jtraiteur.fr'
  const token = '0f8c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f'

  it('lien personnel : /reprendre/:token?source=<origine>', () => {
    expect(configuratorLink(base, token, 'salon')).toBe(`${base}/reprendre/${token}?source=salon`)
    expect(configuratorLink(base, token, null)).toBe(`${base}/reprendre/${token}`)
  })

  it('lien général et variantes par origine', () => {
    expect(generalLink(base)).toBe(`${base}/`)
    expect(generalLink(base, 'carte-visite')).toBe(`${base}/?source=carte-visite`)
  })

  it('message exact, avec les prénoms', () => {
    expect(inviteMessage('Léa & Tom', 'https://x.fr/l')).toBe(
      'Bonjour Léa & Tom, voici le lien pour composer votre menu de mariage avec J&J Traiteur : https://x.fr/l. ' +
        'Le prix se met à jour en direct et on vous rappelle ensuite. Jessica et Jérôme',
    )
    expect(inviteMessage(null, 'L')).toMatch(/^Bonjour, voici le lien/)
  })

  it('WhatsApp, SMS et email : message encodé, numéro sans le « + »', () => {
    const text = 'Bonjour Léa & Tom : https://x.fr/l?source=salon'
    const wa = whatsappMessageHref('+33612345678', text)
    expect(wa.startsWith('https://wa.me/33612345678?text=')).toBe(true)
    expect(decodeURIComponent(wa.split('text=')[1])).toBe(text)
    expect(smsHref('+33612345678', text)).toBe(`sms:+33612345678?&body=${encodeURIComponent(text)}`)
    const mail = mailtoHref('lea@exemple.fr', 'Votre menu', text)
    expect(mail).toContain('mailto:lea@exemple.fr?subject=Votre%20menu&body=')
    expect(mail).not.toContain('&J ') // l'esperluette est encodée
  })

  it('origines : libellés simples, sans anglicisme', () => {
    expect(CONTACT_ORIGINS.map((o) => o.label)).toEqual([
      'Téléphone',
      'Bouche-à-oreille',
      'Instagram',
      'Salon',
      'Collectivité ou association',
      'Autre',
    ])
    expect(sourceLabel('collectivite')).toBe('Collectivité ou association')
    expect(sourceLabel('carte-visite')).toBe('Carte de visite')
    expect(sourceLabel('newsletter-juin')).toBe('newsletter-juin')
    expect(sourceLabel(null)).toBeNull()
  })
})

describe('doublons', () => {
  it('même téléphone, quelle que soit la façon de l’écrire', () => {
    const existing = comp({ phone: '+33611223344' })
    expect(findDuplicates([existing], { phone: '06 11 22 33 44' })).toEqual([existing])
    expect(findDuplicates([existing], { phone: '0033 6 11 22 33 44' })).toEqual([existing])
    expect(findDuplicates([existing], { phone: '06 11 22 33 45' })).toEqual([])
  })

  it('même email, sans tenir compte des majuscules', () => {
    const existing = comp({ email: 'Lea.Martin@Exemple.fr' })
    expect(findDuplicates([existing], { email: ' lea.martin@exemple.fr ' })).toEqual([existing])
  })

  it('trouve aussi un menu envoyé par le lien général et un menu commencé', () => {
    const viaSite = comp({ email: 'a@exemple.fr', phone: '+33600000001' })
    const draft = comp({ status: 'draft', email: 'b@exemple.fr', phone: null, consent_at: null })
    expect(findDuplicates([viaSite, draft], { phone: '06 00 00 00 01' })).toEqual([viaSite])
    expect(findDuplicates([viaSite, draft], { email: 'b@exemple.fr' })).toEqual([draft])
  })

  it('ignore les fiches de test et l’absence de téléphone et d’email', () => {
    const test = comp({ phone: '+33611223344', is_test: true })
    expect(findDuplicates([test], { phone: '0611223344' })).toEqual([])
    expect(findDuplicates([comp({ email: null, phone: null })], { email: null, phone: null })).toEqual([])
  })

  it('badge « Doublon possible » : les deux fiches, jamais une fiche seule', () => {
    const a = manual({ phone: '+33699999999', email: null })
    const b = comp({ phone: '+33699999999' }) // menu envoyé par le lien général
    const c = comp({ email: a.email })
    const alone = comp()
    const ids = duplicateIds([a, b, c, alone])
    expect(ids.has(a.id)).toBe(true)
    expect(ids.has(b.id)).toBe(true)
    expect(ids.has(alone.id)).toBe(false)
    expect(ids.has(c.id)).toBe(false) // a n'a pas d'email
  })

  it('pas de doublon entre un téléphone et un email identiques par hasard', () => {
    const ids = duplicateIds([comp({ phone: '+33612345678', email: 'x@exemple.fr' }), comp({ phone: '+33687654321', email: 'y@exemple.fr' })])
    expect(ids.size).toBe(0)
  })
})

describe('accueil : vues, tri, alerte 48 h', () => {
  it('« À rappeler » = statut nouveau, contacts sans menu compris', () => {
    expect(inView(manual(), 'a_rappeler')).toBe(true)
    expect(inView(manual({ crm_status: 'contacte', contacted_at: hoursAgo(0) }), 'en_cours')).toBe(true)
    expect(inView(comp({ status: 'draft' }), 'a_rappeler')).toBe(false)
    expect(inView(comp({ status: 'draft' }), 'brouillons')).toBe(true)
  })

  it('« À rappeler » : les plus anciennes en premier', () => {
    const recent = comp({ consent_at: hoursAgo(2) })
    const old = comp({ consent_at: hoursAgo(80) })
    const addedYesterday = manual({ created_at: hoursAgo(30) })
    expect(sortForView([recent, old, addedYesterday], 'a_rappeler').map((c) => c.id)).toEqual([old.id, addedYesterday.id, recent.id])
  })

  it('en rouge après 48 h sans premier contact', () => {
    expect(isOverdue(comp({ consent_at: hoursAgo(47) }), NOW)).toBe(false)
    expect(isOverdue(comp({ consent_at: hoursAgo(49) }), NOW)).toBe(true)
    expect(isOverdue(manual({ created_at: hoursAgo(49) }), NOW)).toBe(true)
    expect(isOverdue(comp({ consent_at: hoursAgo(100), crm_status: 'contacte' }), NOW)).toBe(false)
    expect(isOverdue(comp({ status: 'draft', consent_at: null, created_at: hoursAgo(100) }), NOW)).toBe(false)
  })

  it('« reçu il y a… »', () => {
    expect(receivedAgo(hoursAgo(0), NOW)).toBe('reçu à l’instant')
    expect(receivedAgo(hoursAgo(0.5), NOW)).toBe('reçu il y a 30 min')
    expect(receivedAgo(hoursAgo(2), NOW)).toBe('reçu il y a 2 h')
    expect(receivedAgo(hoursAgo(24), NOW)).toBe('reçu il y a 1 jour')
    expect(receivedAgo(hoursAgo(24 * 3), NOW)).toBe('reçu il y a 3 jours')
  })

  it('compteurs : à rappeler, en cours, signés ce mois-ci (hors tests)', () => {
    const now = new Date(NOW)
    const signedNow = comp({ crm_status: 'signe' })
    const signedBefore = comp({ crm_status: 'signe' })
    const signedThenLost = comp({ crm_status: 'perdu', lost_reason: 'autre' })
    const list = [
      comp(),
      manual(),
      comp({ is_test: true }),
      comp({ crm_status: 'degustation' }),
      comp({ crm_status: 'devis_envoye' }),
      signedNow,
      signedBefore,
      signedThenLost,
      comp({ status: 'draft' }),
    ]
    const notes = [
      signedNote(signedNow, '2026-10-03T09:00:00Z'),
      signedNote(signedBefore, '2026-09-30T18:00:00Z'),
      signedNote(signedThenLost, '2026-10-05T09:00:00Z'),
    ]
    expect(homeCounters(list, notes, now)).toEqual({ aRappeler: 2, enCours: 2, signesCeMois: 1 })
  })
})

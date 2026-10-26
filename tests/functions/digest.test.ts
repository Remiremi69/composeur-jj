import { describe, expect, it } from 'vitest'
import {
  buildDigest,
  digestEmail,
  isAllClear,
  isParisMonday8,
  type DigestNote,
  type DigestRow,
} from '../../supabase/functions/send-weekly-digest/digest.ts'

const NOW = new Date('2026-10-26T07:00:00Z').getTime() // lundi 8 h à Paris
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString()
const daysAgo = (d: number) => hoursAgo(d * 24)

let seq = 0
function row(extra: Partial<DigestRow> = {}): DigestRow {
  seq++
  return {
    id: `r${seq}`,
    couple_names: `Couple ${seq}`,
    phone: '+33612345678',
    wedding_date: '2027-06-19',
    crm_status: 'nouveau',
    created_at: daysAgo(3),
    consent_at: daysAgo(3),
    contacted_at: null,
    ajout_manuel: false,
    ...extra,
  }
}
const note = (r: DigestRow, to: string, at: string): DigestNote => ({ composition_id: r.id, to_status: to, created_at: at })

describe('résumé hebdomadaire : contenu', () => {
  it('à rappeler : sans premier contact depuis plus de 48 h, les plus anciennes d’abord', () => {
    const fresh = row({ consent_at: hoursAgo(20) })
    const old = row({ consent_at: daysAgo(6) })
    const mid = row({ consent_at: daysAgo(3) })
    const manualNoMenu = row({ ajout_manuel: true, consent_at: null, created_at: daysAgo(4) })
    const d = buildDigest([fresh, old, mid, manualNoMenu], [], NOW)
    expect(d.waiting.map((l) => l.id)).toEqual([old.id, manualNoMenu.id, mid.id])
  })

  it('en cours depuis plus de 14 jours sans nouvelle étape', () => {
    const stuck = row({ crm_status: 'devis_envoye', contacted_at: daysAgo(30) })
    const moving = row({ crm_status: 'devis_envoye', contacted_at: daysAgo(30) })
    const recentContact = row({ crm_status: 'contacte', contacted_at: daysAgo(5) })
    const signed = row({ crm_status: 'signe', contacted_at: daysAgo(60) })
    const notes = [note(stuck, 'devis_envoye', daysAgo(20)), note(moving, 'devis_envoye', daysAgo(3))]
    const d = buildDigest([stuck, moving, recentContact, signed], notes, NOW)
    expect(d.stalled.map((l) => l.id)).toEqual([stuck.id])
  })

  it('bilan de la semaine', () => {
    const received = row({ consent_at: daysAgo(2), crm_status: 'contacte', contacted_at: daysAgo(1) })
    const added = row({ ajout_manuel: true, consent_at: null, created_at: daysAgo(1) })
    const signed = row({ crm_status: 'signe', consent_at: daysAgo(40), contacted_at: daysAgo(39) })
    const lost = row({ crm_status: 'perdu', consent_at: daysAgo(40), contacted_at: daysAgo(39) })
    const old = row({ consent_at: daysAgo(10) })
    const notes = [note(signed, 'signe', daysAgo(2)), note(lost, 'perdu', daysAgo(6)), note(old, 'contacte', daysAgo(9))]
    const d = buildDigest([received, added, signed, lost, old], notes, NOW)
    expect(d.week).toEqual({ received: 1, added: 1, contacted: 1, signed: 1, lost: 1 })
  })

  it('tout est à jour : « Rien en attente, bravo »', () => {
    const d = buildDigest([row({ consent_at: hoursAgo(5) }), row({ crm_status: 'contacte', contacted_at: daysAgo(2) })], [], NOW)
    expect(isAllClear(d)).toBe(true)
    const mail = digestEmail(d, { adminUrl: 'https://composer.j-jtraiteur.fr/admin', now: NOW })
    expect(mail.html).toContain('Rien en attente, bravo')
    expect(mail.subject).toBe('Votre semaine J&J : rien en attente')
  })

  it('email : prénoms, téléphone, date de mariage, lien vers la fiche ; tout est échappé', () => {
    const r = row({ couple_names: '<b>Léa</b> & "Tom"', consent_at: daysAgo(4) })
    const d = buildDigest([r], [], NOW)
    const mail = digestEmail(d, { adminUrl: 'https://composer.j-jtraiteur.fr/admin', now: NOW })
    expect(mail.subject).toBe('Votre semaine J&J : 1 demande à suivre')
    expect(mail.html).toContain('&lt;b&gt;Léa&lt;/b&gt; &amp; &quot;Tom&quot;')
    expect(mail.html).not.toContain('<b>Léa</b>')
    expect(mail.html).toContain('+33 6 12 34 56 78')
    expect(mail.html).toContain('19 juin 2027')
    expect(mail.html).toContain(`https://composer.j-jtraiteur.fr/admin?demande=${r.id}`)
    expect(mail.html).not.toContain('Rien en attente')
  })
})

describe('résumé hebdomadaire : lundi 8 h, heure de Paris', () => {
  it('été (UTC+2) : 6 h UTC', () => {
    expect(isParisMonday8(new Date('2026-06-01T06:00:00Z'))).toBe(true)
    expect(isParisMonday8(new Date('2026-06-01T07:00:00Z'))).toBe(false)
  })
  it('hiver (UTC+1) : 7 h UTC', () => {
    expect(isParisMonday8(new Date('2026-11-02T07:00:00Z'))).toBe(true)
    expect(isParisMonday8(new Date('2026-11-02T06:00:00Z'))).toBe(false)
  })
  it('pas un autre jour', () => {
    expect(isParisMonday8(new Date('2026-11-03T07:00:00Z'))).toBe(false)
  })
})

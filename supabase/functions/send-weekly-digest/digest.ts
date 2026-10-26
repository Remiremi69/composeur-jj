// Résumé hebdomadaire envoyé au traiteur (lundi 8 h) : ce qui attend, et le
// bilan de la semaine. Fonctions pures, testées dans tests/functions/digest.test.ts.
// RÈGLE : toute valeur dynamique passe par escapeHtml().

import { COLORS, NO_CONTACT, type BrandContact } from '../_shared/brand.ts'
import { formatPhone } from '../_shared/core/format.ts'
import { emailLayout } from '../_shared/email-layout.ts'
import { escapeHtml } from '../_shared/html.ts'
import { formatDate } from '../_shared/recap.ts'

const HOUR = 3600_000
const DAY = 24 * HOUR
const ACTIVE = ['contacte', 'degustation', 'devis_envoye']

// Colonnes lues en base (fiches envoyées ou ajoutées à la main, hors tests).
export interface DigestRow {
  id: string
  couple_names: string | null
  phone: string | null
  wedding_date: string | null
  crm_status: string
  created_at: string
  consent_at: string | null
  contacted_at: string | null
  ajout_manuel: boolean
}

export interface DigestNote {
  composition_id: string
  to_status: string | null
  created_at: string
}

export interface DigestLine {
  id: string
  coupleNames: string
  phone: string | null
  weddingDate: string | null
  since: string // date de référence (réception ou dernier changement)
}

export interface Digest {
  waiting: DigestLine[] // sans premier contact depuis plus de 48 h
  stalled: DigestLine[] // en cours, sans changement depuis plus de 14 jours
  week: { received: number; added: number; contacted: number; signed: number; lost: number }
}

const receivedAt = (r: DigestRow) => r.consent_at ?? r.created_at
const line = (r: DigestRow, since: string): DigestLine => ({
  id: r.id,
  coupleNames: r.couple_names?.trim() || 'Sans prénoms',
  phone: r.phone,
  weddingDate: r.wedding_date,
  since,
})

export function buildDigest(rows: DigestRow[], notes: DigestNote[], now = Date.now()): Digest {
  // Dernier changement de statut de chaque fiche.
  const lastChange = new Map<string, string>()
  for (const n of notes) {
    const prev = lastChange.get(n.composition_id)
    if (!prev || n.created_at > prev) lastChange.set(n.composition_id, n.created_at)
  }
  const older = (iso: string, ms: number) => now - new Date(iso).getTime() > ms
  const inWeek = (iso: string | null) => !!iso && now - new Date(iso).getTime() <= 7 * DAY && new Date(iso).getTime() <= now

  const waiting = rows
    .filter((r) => r.crm_status === 'nouveau' && older(receivedAt(r), 48 * HOUR))
    .sort((a, b) => receivedAt(a).localeCompare(receivedAt(b)))
    .map((r) => line(r, receivedAt(r)))

  const stalled = rows
    .filter((r) => ACTIVE.includes(r.crm_status))
    .map((r) => ({ r, since: lastChange.get(r.id) ?? r.contacted_at ?? receivedAt(r) }))
    .filter(({ since }) => older(since, 14 * DAY))
    .sort((a, b) => a.since.localeCompare(b.since))
    .map(({ r, since }) => line(r, since))

  const weekNotes = notes.filter((n) => inWeek(n.created_at))
  const distinct = (status: string) => new Set(weekNotes.filter((n) => n.to_status === status).map((n) => n.composition_id)).size

  return {
    waiting,
    stalled,
    week: {
      received: rows.filter((r) => inWeek(r.consent_at)).length, // menus envoyés par les couples
      added: rows.filter((r) => r.ajout_manuel && inWeek(r.created_at)).length,
      contacted: rows.filter((r) => inWeek(r.contacted_at)).length,
      signed: distinct('signe'),
      lost: distinct('perdu'),
    },
  }
}

export function isAllClear(d: Digest): boolean {
  return d.waiting.length === 0 && d.stalled.length === 0
}

function days(since: string, now: number): string {
  const n = Math.max(0, Math.floor((now - new Date(since).getTime()) / DAY))
  return n <= 1 ? 'depuis 1 jour' : `depuis ${n} jours`
}

function listHtml(lines: DigestLine[], adminUrl: string | null, now: number): string {
  return `<ul style="margin:8px 0 0;padding:0 0 0 18px">${lines
    .map((l) => {
      const name = adminUrl
        ? `<a href="${escapeHtml(`${adminUrl}?demande=${l.id}`)}" style="color:${COLORS.slate};font-weight:bold">${escapeHtml(l.coupleNames)}</a>`
        : `<strong>${escapeHtml(l.coupleNames)}</strong>`
      const phone = l.phone ? ` · ${escapeHtml(formatPhone(l.phone))}` : ''
      const date = formatDate(l.weddingDate)
      return `<li style="margin:0 0 6px">${name}${phone} · ${date ? `mariage le ${escapeHtml(date)}` : 'date à préciser'} <span style="color:${COLORS.slate}">(${days(l.since, now)})</span></li>`
    })
    .join('')}</ul>`
}

export function digestEmail(
  d: Digest,
  opts: { adminUrl: string | null; brand?: BrandContact; now?: number },
): { subject: string; html: string } {
  const now = opts.now ?? Date.now()
  const w = d.week
  const bilan = `<p style="margin:20px 0 0"><strong>La semaine en bref</strong><br>
    ${w.received} menu${w.received > 1 ? 's' : ''} reçu${w.received > 1 ? 's' : ''} · ${w.added} contact${w.added > 1 ? 's' : ''} ajouté${w.added > 1 ? 's' : ''} à la main · ${w.contacted} premier${w.contacted > 1 ? 's' : ''} contact${w.contacted > 1 ? 's' : ''} · ${w.signed} signé${w.signed > 1 ? 's' : ''} · ${w.lost} perdu${w.lost > 1 ? 's' : ''}</p>`

  const parts: string[] = []
  if (isAllClear(d)) {
    parts.push(`<p style="margin:0;font-size:18px"><strong>Rien en attente, bravo.</strong></p>`)
  } else {
    if (d.waiting.length > 0) {
      parts.push(`<p style="margin:0"><strong>À rappeler : pas encore de premier contact depuis plus de 48 h (${d.waiting.length})</strong></p>${listHtml(d.waiting, opts.adminUrl, now)}`)
    }
    if (d.stalled.length > 0) {
      parts.push(`<p style="margin:${d.waiting.length ? '20px' : '0'} 0 0"><strong>En cours depuis plus de 14 jours sans nouvelle étape (${d.stalled.length})</strong></p>${listHtml(d.stalled, opts.adminUrl, now)}`)
    }
  }

  const pending = d.waiting.length + d.stalled.length
  const subject = pending === 0 ? 'Votre semaine J&J : rien en attente' : `Votre semaine J&J : ${pending} demande${pending > 1 ? 's' : ''} à suivre`
  const html = emailLayout({
    brand: opts.brand ?? NO_CONTACT,
    title: 'Votre résumé de la semaine',
    preheader: pending === 0 ? 'Rien en attente, bravo.' : `${pending} demande${pending > 1 ? 's' : ''} à suivre cette semaine.`,
    bodyHtml: parts.join('') + bilan,
    cta: opts.adminUrl ? { label: 'Ouvrir mes demandes', url: opts.adminUrl } : null,
  })
  return { subject, html }
}

// Lundi 8 h à Paris ? pg_cron tourne en heure UTC : la tâche est programmée
// à 6 h ET 7 h UTC, et seul l'appel qui tombe à 8 h (heure de Paris, été comme
// hiver) envoie le résumé.
export function isParisMonday8(date: Date): boolean {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return get('weekday') === 'lundi' && Number(get('hour')) === 8
}

// Suivi commercial (back-office) : statuts, onglets, recherche, entonnoir et
// statistiques. Fonctions pures, testées dans tests/crm.test.ts.
//
// Règles communes :
// • les compositions de TEST (is_test) sont exclues de toutes les statistiques ;
// • l'entonnoir compte l'étape la plus avancée JAMAIS atteinte, lue dans
//   l'historique structuré (composition_notes.from_status / to_status), jamais
//   dans du texte : une demande passée par « dégustation » puis « perdu »
//   compte bien dans les dégustations.
import type { Composition, CompositionNote, CrmStatus, Formule, LostReason, Step } from '../types/db'

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  degustation: 'Dégustation',
  devis_envoye: 'Devis envoyé',
  signe: 'Signé',
  perdu: 'Perdu',
}
export const CRM_STATUSES = Object.keys(CRM_STATUS_LABELS) as CrmStatus[]

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  prix: 'Prix',
  date_indisponible: 'Date indisponible',
  autre_traiteur: 'Autre traiteur',
  sans_reponse: 'Sans réponse',
  autre: 'Autre',
}
export const LOST_REASONS = Object.keys(LOST_REASON_LABELS) as LostReason[]

// Ordre de l'entonnoir (« perdu » n'est pas une étape).
const STAGES: CrmStatus[] = ['nouveau', 'contacte', 'degustation', 'devis_envoye', 'signe']
const stageRank = (s: CrmStatus | null | undefined) => (s ? STAGES.indexOf(s) : -1)

const DAY = 24 * 3600 * 1000

// Date de réception d'une demande : son envoi (consent_at), sinon sa création.
export function receivedAt(c: Composition): string {
  return c.consent_at ?? c.created_at
}

// ---------------------------------------------------------------- Liste

export type RequestTab = 'nouveaux' | 'en_cours' | 'signes' | 'perdus' | 'brouillons'

export const TAB_LABELS: Record<RequestTab, string> = {
  nouveaux: 'Nouveaux',
  en_cours: 'En cours',
  signes: 'Signés',
  perdus: 'Perdus',
  brouillons: 'Menus en cours',
}

export function inTab(c: Composition, tab: RequestTab): boolean {
  if (tab === 'brouillons') return c.status === 'draft'
  if (c.status !== 'submitted') return false
  switch (tab) {
    case 'nouveaux':
      return c.crm_status === 'nouveau'
    case 'en_cours':
      return ['contacte', 'degustation', 'devis_envoye'].includes(c.crm_status)
    case 'signes':
      return c.crm_status === 'signe'
    case 'perdus':
      return c.crm_status === 'perdu'
  }
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Recherche par prénoms ou email, sans tenir compte des accents ni des majuscules.
export function matchesSearch(c: Composition, query: string): boolean {
  const q = fold(query.trim())
  if (!q) return true
  return fold(`${c.couple_names ?? ''} ${c.email ?? ''}`).includes(q)
}

export type SortKey = 'reception' | 'mariage'

// Réception : plus récentes d'abord. Mariage : plus proches d'abord, sans date à la fin.
export function sortRequests(list: Composition[], key: SortKey): Composition[] {
  const copy = [...list]
  if (key === 'reception') {
    return copy.sort((a, b) => receivedAt(b).localeCompare(receivedAt(a)))
  }
  return copy.sort((a, b) => {
    if (!a.wedding_date) return b.wedding_date ? 1 : 0
    if (!b.wedding_date) return -1
    return a.wedding_date.localeCompare(b.wedding_date)
  })
}

// Libellé de l'étape atteinte par un brouillon (écran groupé compris).
export function lastStepLabel(lastStep: string | null, steps: Step[]): string {
  if (!lastStep) return '—'
  const pages: Record<string, string> = {
    accueil: 'Accueil',
    formule: 'Choix de la formule',
    options: 'Options',
    recap: 'Récapitulatif',
  }
  if (pages[lastStep]) return pages[lastStep]
  const step = steps.find((s) => s.slug === lastStep)
  if (step) return step.nav_title || step.title
  const grouped = steps.find((s) => s.group_slug === lastStep)
  return grouped?.group_nav_title || grouped?.group_title || lastStep
}

// Lien WhatsApp à partir d'un numéro normalisé (+33612345678).
export function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

// ---------------------------------------------------------------- Export CSV

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// CSV lisible par Excel en français : séparateur « ; », BOM UTF-8.
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(';'))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

export function requestsCsv(list: Composition[], formules: Formule[], steps: Step[], tab: RequestTab): string {
  const formule = (id: string | null) => formules.find((f) => f.id === id)?.name ?? ''
  if (tab === 'brouillons') {
    return toCsv(
      ['Prénoms', 'Email', 'Date du mariage', 'Convives', 'Étape atteinte', 'Dernière activité', 'Source'],
      list.map((c) => [
        c.couple_names,
        c.email,
        c.wedding_date,
        c.guest_count,
        lastStepLabel(c.last_step, steps),
        c.updated_at.slice(0, 16).replace('T', ' '),
        c.source,
      ]),
    )
  }
  return toCsv(
    ['Prénoms', 'Email', 'Téléphone', 'Date du mariage', 'Convives', 'Lieu', 'Formule', 'Estimation totale',
      'Par personne', 'Statut', 'Motif de perte', 'Reçu le', 'Premier contact', 'Source'],
    list.map((c) => [
      c.couple_names,
      c.email,
      c.phone,
      c.wedding_date,
      c.guest_count,
      c.venue,
      formule(c.formule_id),
      c.total_estimate,
      perPerson(c)?.toFixed(2).replace('.', ','),
      CRM_STATUS_LABELS[c.crm_status],
      c.lost_reason ? LOST_REASON_LABELS[c.lost_reason] : '',
      receivedAt(c).slice(0, 10),
      c.contacted_at?.slice(0, 10) ?? '',
      c.source,
    ]),
  )
}

// ---------------------------------------------------------------- Statistiques

const active = (list: Composition[]) => list.filter((c) => !c.is_test)
const submitted = (list: Composition[]) => active(list).filter((c) => c.status === 'submitted')

// Étape la plus avancée jamais atteinte (historique structuré + état actuel).
export function furthestStage(c: Composition, statusNotes: CompositionNote[]): number {
  let rank = stageRank(c.crm_status)
  if (c.contacted_at) rank = Math.max(rank, stageRank('contacte'))
  for (const n of statusNotes) {
    if (n.composition_id !== c.id || n.kind !== 'statut') continue
    rank = Math.max(rank, stageRank(n.to_status), stageRank(n.from_status))
  }
  return rank
}

export interface FunnelStep {
  key: string
  label: string
  count: number
  rate: number | null // part de l'étape précédente (0–1)
}

// Entonnoir sur les N derniers jours (compositions créées dans la période).
export function funnel(list: Composition[], notes: CompositionNote[], days: number, now = Date.now()): FunnelStep[] {
  const since = now - days * DAY
  const cohort = active(list).filter((c) => new Date(c.created_at).getTime() >= since)
  const sent = cohort.filter((c) => c.status === 'submitted')
  const reached = (rank: number) => sent.filter((c) => furthestStage(c, notes) >= rank).length
  const steps: [string, string, number][] = [
    ['commences', 'Menus commencés', cohort.length],
    ['envoyes', 'Menus envoyés', sent.length],
    ['contactes', 'Contactés', reached(stageRank('contacte'))],
    ['degustations', 'Dégustations', reached(stageRank('degustation'))],
    ['signes', 'Signés', reached(stageRank('signe'))],
  ]
  return steps.map(([key, label, count], i) => ({
    key,
    label,
    count,
    rate: i === 0 ? null : steps[i - 1][2] > 0 ? count / steps[i - 1][2] : null,
  }))
}

// Délai moyen entre la réception et le premier contact (en heures). Les
// demandes reprises de l'ancien « traité » n'ont pas de date : ignorées.
export function averageFirstContactHours(list: Composition[]): { hours: number; count: number } | null {
  const delays = submitted(list)
    .filter((c) => c.contacted_at)
    .map((c) => (new Date(c.contacted_at as string).getTime() - new Date(receivedAt(c)).getTime()) / 3600_000)
    .filter((h) => h >= 0)
  if (delays.length === 0) return null
  return { hours: delays.reduce((a, b) => a + b, 0) / delays.length, count: delays.length }
}

export interface SourceRow {
  source: string
  sent: number
  signed: number
  rate: number // signés / envoyés
}

export function conversionBySource(list: Composition[]): SourceRow[] {
  const rows = new Map<string, SourceRow>()
  for (const c of submitted(list)) {
    const source = c.source?.trim() || 'Direct / inconnue'
    const row = rows.get(source) ?? { source, sent: 0, signed: 0, rate: 0 }
    row.sent++
    if (c.crm_status === 'signe') row.signed++
    rows.set(source, row)
  }
  return [...rows.values()]
    .map((r) => ({ ...r, rate: r.signed / r.sent }))
    .sort((a, b) => b.sent - a.sent)
}

// Prix par personne tout compris d'une demande (figé à l'envoi si connu).
export function perPerson(c: Composition): number | null {
  if (c.estimate && Number.isFinite(c.estimate.perPersonAllIn)) return c.estimate.perPersonAllIn
  if (c.total_estimate != null && c.guest_count) return Number(c.total_estimate) / c.guest_count
  return null
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

export function basketComparison(list: Composition[]): { all: number | null; signed: number | null } {
  const sent = submitted(list)
  const pp = (l: Composition[]) => l.map(perPerson).filter((v): v is number => v != null && v > 0)
  return { all: mean(pp(sent)), signed: mean(pp(sent.filter((c) => c.crm_status === 'signe'))) }
}

export function lostReasons(list: Composition[]): { reason: string; count: number }[] {
  const counts = new Map<LostReason, number>()
  for (const c of submitted(list)) {
    if (c.crm_status === 'perdu' && c.lost_reason) counts.set(c.lost_reason, (counts.get(c.lost_reason) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason: LOST_REASON_LABELS[reason], count }))
    .sort((a, b) => b.count - a.count)
}

// Plats les plus choisis dans les menus envoyés (hors tests).
export function topDishes(
  list: Composition[],
  compItems: { composition_id: string; item_id: string }[],
  items: { id: string; name: string }[],
  limit = 10,
): { name: string; count: number }[] {
  const sentIds = new Set(submitted(list).map((c) => c.id))
  const nameById = new Map(items.map((i) => [i.id, i.name]))
  const counts = new Map<string, number>()
  for (const ci of compItems) {
    const name = nameById.get(ci.item_id)
    if (!name || !sentIds.has(ci.composition_id)) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

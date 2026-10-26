// Espace traiteur sur téléphone (lot 7) : contacts ajoutés à la main, liens
// à envoyer, doublons, compteurs de l'accueil. Fonctions pures, testées dans
// tests/contacts.test.ts.
import { isWithoutMenu } from '@core/draft'
import { normalizePhone } from '@core/validation'
import type { Composition, CompositionNote } from '../types/db'
import { receivedAt } from './crm'

export { isWithoutMenu }

const HOUR = 3600_000
const DAY = 24 * HOUR

// ---------------------------------------------------------------- Origines

// Origine d'un contact ajouté à la main (valeurs acceptées par ajouter_contact).
export const CONTACT_ORIGINS = [
  { slug: 'telephone', label: 'Téléphone' },
  { slug: 'bouche-a-oreille', label: 'Bouche-à-oreille' },
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'salon', label: 'Salon' },
  { slug: 'collectivite', label: 'Collectivité ou association' },
  { slug: 'autre', label: 'Autre' },
] as const
export type ContactOrigin = (typeof CONTACT_ORIGINS)[number]['slug']

// Variantes du lien général du configurateur (page « Mes liens »).
export const LINK_SOURCES = [
  { slug: 'telephone', label: 'Après un appel' },
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'salon', label: 'Salon du mariage' },
  { slug: 'carte-visite', label: 'Carte de visite' },
  { slug: 'bouche-a-oreille', label: 'Bouche-à-oreille' },
] as const

// Libellé lisible d'une source enregistrée (origine manuelle ou ?source=).
export function sourceLabel(source: string | null): string | null {
  if (!source) return null
  const origin = CONTACT_ORIGINS.find((o) => o.slug === source)
  if (origin) return origin.label
  const link = LINK_SOURCES.find((l) => l.slug === source)
  return link ? link.label : source
}

// ---------------------------------------------------------------- Liens et messages

export function generalLink(appUrl: string, source?: string): string {
  return source ? `${appUrl}/?source=${encodeURIComponent(source)}` : `${appUrl}/`
}

// Lien personnel d'une fiche : le couple compose son menu sur CETTE fiche.
// Le ?source= ne sert qu'à la mesure d'audience (cf. lib/attribution.ts).
export function configuratorLink(appUrl: string, shareToken: string, source: string | null): string {
  const base = `${appUrl}/reprendre/${shareToken}`
  return source ? `${base}?source=${encodeURIComponent(source)}` : base
}

export function inviteMessage(coupleNames: string | null, link: string): string {
  const names = coupleNames?.trim()
  return (
    `Bonjour${names ? ` ${names}` : ''}, voici le lien pour composer votre menu de mariage avec J&J Traiteur : ${link}. ` +
    'Le prix se met à jour en direct et on vous rappelle ensuite. Jessica et Jérôme'
  )
}

const digits = (phone: string) => phone.replace(/\D/g, '')

// WhatsApp avec message prérempli (vers le numéro s'il est connu).
export function whatsappMessageHref(phone: string | null, text: string): string {
  return `https://wa.me/${phone ? digits(phone) : ''}?text=${encodeURIComponent(text)}`
}

// SMS : « ?&body= » est compris à la fois par iPhone et par Android.
export function smsHref(phone: string | null, text: string): string {
  return `sms:${phone ?? ''}?&body=${encodeURIComponent(text)}`
}

export function mailtoHref(email: string | null, subject: string, body: string): string {
  return `mailto:${email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ---------------------------------------------------------------- Doublons

const emailKey = (email: string | null | undefined) => email?.trim().toLowerCase() || null
const phoneKey = (phone: string | null | undefined) => (phone ? normalizePhone(phone) : null)

// Fiches existantes (hors tests) qui ont le même téléphone ou le même email.
export function findDuplicates(
  list: Composition[],
  contact: { phone?: string | null; email?: string | null },
  excludeId?: string,
): Composition[] {
  const phone = phoneKey(contact.phone)
  const email = emailKey(contact.email)
  if (!phone && !email) return []
  return list.filter(
    (c) =>
      c.id !== excludeId &&
      !c.is_test &&
      ((phone != null && phoneKey(c.phone) === phone) || (email != null && emailKey(c.email) === email)),
  )
}

// Identifiants des fiches qui partagent un téléphone ou un email avec une
// autre fiche (badge « Doublon possible »). Aucune fusion automatique.
export function duplicateIds(list: Composition[]): Set<string> {
  const byKey = new Map<string, string[]>()
  for (const c of list) {
    if (c.is_test) continue
    const phone = phoneKey(c.phone)
    const email = emailKey(c.email)
    const keys = [phone && `tel:${phone}`, email && `email:${email}`].filter((k): k is string => !!k)
    for (const k of keys) byKey.set(k, [...(byKey.get(k) ?? []), c.id])
  }
  const out = new Set<string>()
  for (const ids of byKey.values()) if (ids.length > 1) ids.forEach((id) => out.add(id))
  return out
}

// ---------------------------------------------------------------- Accueil

export type HomeView = 'a_rappeler' | 'en_cours' | 'signes' | 'perdus' | 'brouillons'

export const HOME_VIEW_LABELS: Record<HomeView, string> = {
  a_rappeler: 'À rappeler',
  en_cours: 'En cours',
  signes: 'Signés',
  perdus: 'Perdus',
  brouillons: 'Menus commencés',
}

const ACTIVE = ['contacte', 'degustation', 'devis_envoye']

export function inView(c: Composition, view: HomeView): boolean {
  if (view === 'brouillons') return c.status === 'draft'
  if (c.status !== 'submitted') return false
  switch (view) {
    case 'a_rappeler':
      return c.crm_status === 'nouveau'
    case 'en_cours':
      return ACTIVE.includes(c.crm_status)
    case 'signes':
      return c.crm_status === 'signe'
    case 'perdus':
      return c.crm_status === 'perdu'
  }
}

// « À rappeler » : les plus anciennes d'abord (elles attendent depuis le plus
// longtemps). Brouillons : dernière activité d'abord. Autres : plus récentes d'abord.
export function sortForView(list: Composition[], view: HomeView): Composition[] {
  const copy = [...list]
  if (view === 'a_rappeler') return copy.sort((a, b) => receivedAt(a).localeCompare(receivedAt(b)))
  if (view === 'brouillons') return copy.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return copy.sort((a, b) => receivedAt(b).localeCompare(receivedAt(a)))
}

// Demande « à rappeler » qui attend depuis plus de 48 h : affichée en rouge.
export function isOverdue(c: Composition, now = Date.now()): boolean {
  return c.status === 'submitted' && c.crm_status === 'nouveau' && now - new Date(receivedAt(c)).getTime() > 48 * HOUR
}

// « reçu il y a 2 h », « reçu il y a 3 jours »…
export function receivedAgo(iso: string, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(iso).getTime())
  if (ms < HOUR) {
    const min = Math.floor(ms / 60_000)
    return min < 1 ? 'reçu à l’instant' : `reçu il y a ${min} min`
  }
  if (ms < DAY) return `reçu il y a ${Math.floor(ms / HOUR)} h`
  const days = Math.floor(ms / DAY)
  if (days < 60) return `reçu il y a ${days} jour${days > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  return `reçu il y a ${months} mois`
}

export interface HomeCounters {
  aRappeler: number
  enCours: number
  signesCeMois: number
}

// Les trois gros compteurs (hors tests). « Signés ce mois-ci » : fiches
// actuellement signées dont le passage à « Signé » date du mois civil en cours.
export function homeCounters(list: Composition[], statusNotes: CompositionNote[], now = new Date()): HomeCounters {
  const live = list.filter((c) => !c.is_test)
  const signed = new Map(live.filter((c) => c.status === 'submitted' && c.crm_status === 'signe').map((c) => [c.id, c]))
  const lastSigned = new Map<string, string>()
  for (const n of statusNotes) {
    if (n.kind !== 'statut' || n.to_status !== 'signe' || !signed.has(n.composition_id)) continue
    const prev = lastSigned.get(n.composition_id)
    if (!prev || n.created_at > prev) lastSigned.set(n.composition_id, n.created_at)
  }
  let signesCeMois = 0
  for (const iso of lastSigned.values()) {
    const d = new Date(iso)
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) signesCeMois++
  }
  return {
    aRappeler: live.filter((c) => inView(c, 'a_rappeler')).length,
    enCours: live.filter((c) => inView(c, 'en_cours')).length,
    signesCeMois,
  }
}

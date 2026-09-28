// Mesure d'audience Plausible (sans cookie), pour l'entonnoir du Composeur.
//
// • Chargée seulement en production ET si VITE_PLAUSIBLE_DOMAIN est défini ;
//   sinon track() ne fait rien.
// • Aucune donnée personnelle : ni prénoms, ni email, ni téléphone, ni date.
// • Pages vues envoyées À LA MAIN avec une adresse masquée : les liens
//   /reprendre/…, /menu/… et /desinscription/… contiennent le jeton qui ouvre
//   le menu d'un couple, il ne doit jamais partir chez Plausible.
import { getAttribution } from './attribution'

type PlausibleFn = ((event: string, options?: { u?: string; props?: Record<string, string | number> }) => void) & {
  q?: unknown[]
}

declare global {
  interface Window {
    plausible?: PlausibleFn
  }
}

const DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim()

export function initTracking(): void {
  if (!import.meta.env.PROD || !DOMAIN || window.plausible) return
  // File d'attente : les événements envoyés avant le chargement du script
  // sont transmis ensuite.
  const queued: PlausibleFn = (...args) => {
    ;(queued.q = queued.q || []).push(args)
  }
  window.plausible = queued
  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = DOMAIN
  script.src = 'https://plausible.io/js/script.manual.js'
  document.head.appendChild(script)
}

// Chemins contenant un jeton : masqués.
const TOKEN_ROUTES = ['reprendre', 'menu', 'desinscription']
// Seuls ces paramètres d'adresse sont conservés (provenance).
const KEPT_PARAMS = ['source', 'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

export function maskUrl(pathname: string, search = ''): string {
  const parts = pathname.split('/')
  if (parts.length >= 3 && TOKEN_ROUTES.includes(parts[1])) parts[2] = ':token'
  const params = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const key of KEPT_PARAMS) {
    const v = params.get(key)
    if (v) kept.set(key, v)
  }
  const qs = kept.toString()
  return `${parts.join('/')}${qs ? `?${qs}` : ''}`
}

export function trackPageview(pathname: string, search: string): void {
  if (!window.plausible) return
  window.plausible('pageview', { u: `${window.location.origin}${maskUrl(pathname, search)}` })
}

export type TrackEvent =
  | 'Accueil vu'
  | 'Accueil validé'
  | 'Formule choisie'
  | 'Étape validée'
  | 'Options vues'
  | 'Récap vu'
  | 'Envoi'
  | 'Erreur envoi'
  | 'Reprise brouillon'
  | 'Réservation appel cliquée'
  | 'Menu partagé'
  | 'PDF téléchargé'

// Événement de l'entonnoir, avec la provenance du visiteur (source) partout.
export function track(event: TrackEvent, props: Record<string, string | number> = {}): void {
  if (!window.plausible) return
  window.plausible(event, { props: { source: getAttribution().source ?? 'direct', ...props } })
}

// Tranche de convives (jamais le nombre exact).
export function guestBracket(guests: number): '<80' | '80-150' | '>150' {
  if (guests < 80) return '<80'
  return guests <= 150 ? '80-150' : '>150'
}

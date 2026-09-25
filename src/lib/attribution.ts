// Provenance du couple (?source=, utm_*) : lue à la PREMIÈRE arrivée sur le
// site, conservée pour la session, puis transmise au brouillon et à l'envoi.
import { LANDING_KEYS } from '@core/draft'
import type { LandingParams } from '../types/db'

const KEY = 'composeur:provenance'

export interface Attribution {
  source: string | null
  landingParams: LandingParams | null
}

// À appeler au démarrage de l'application.
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(KEY)) return // déjà capturée pour cette session
    const params = new URLSearchParams(window.location.search)
    const found: LandingParams = {}
    for (const key of LANDING_KEYS) {
      const value = params.get(key)
      if (value) found[key] = value.slice(0, 200)
    }
    if (Object.keys(found).length === 0) return
    const attribution: Attribution = {
      source: found.source ?? found.utm_source ?? null,
      landingParams: found,
    }
    sessionStorage.setItem(KEY, JSON.stringify(attribution))
  } catch {
    // stockage indisponible : pas d'attribution, sans conséquence
  }
}

export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Attribution
  } catch {
    // ignore
  }
  return { source: null, landingParams: null }
}

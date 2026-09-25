// Appels aux Edge Functions des brouillons (save-draft, get-draft,
// draft-opt-out). Les échecs sont silencieux côté utilisateur : la
// sauvegarde ne doit jamais bloquer la composition.
import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Estimate } from '@core/pricing'
import { supabase } from './supabase'
import type { ClientState, LandingParams } from '../types/db'
import type { CoupleInfo } from '../context/CompositionContext'

export async function createDraft(input: {
  couple: CoupleInfo
  source: string | null
  landingParams: LandingParams | null
  turnstileToken: string | null
}): Promise<{ compositionId: string; shareToken: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('save-draft', {
      body: {
        couple: input.couple,
        source: input.source,
        landingParams: input.landingParams,
        turnstileToken: input.turnstileToken,
        website: '',
      },
    })
    if (error || !data?.ok || typeof data.shareToken !== 'string') return null
    return { compositionId: data.compositionId, shareToken: data.shareToken }
  } catch {
    return null
  }
}

export type UpdateResult = 'ok' | 'not_draft' | 'error'

export async function updateDraft(
  shareToken: string,
  patch: {
    couple: CoupleInfo
    formuleId: string | null
    lastStep: string | null
    clientState: ClientState
  },
): Promise<UpdateResult> {
  try {
    const { data, error } = await supabase.functions.invoke('save-draft', {
      body: { shareToken, ...patch },
    })
    if (error) {
      if (error instanceof FunctionsHttpError && error.context.status === 409) return 'not_draft'
      return 'error'
    }
    return data?.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

// Vue en lecture seule d'un menu envoyé (aucune donnée de contact).
export interface ReadOnlyMenu {
  coupleNames: string
  weddingDate: string | null
  guestCount: number
  formuleName: string
  sections: {
    title: string
    lines: { name: string; description: string | null; supplement: number; quantity: number }[]
  }[]
  options: { name: string; price: number | null; priceUnit: 'par_personne' | 'forfait' }[]
  estimate: Estimate
}

export type DraftFetch =
  | {
      status: 'draft'
      compositionId: string
      couple: CoupleInfo
      formuleId: string | null
      lastStep: string | null
      clientState: Partial<ClientState> | null
    }
  | { status: 'submitted'; menu: ReadOnlyMenu }
  | { status: 'invalid' } // lien inconnu ou mal formé
  | { status: 'error' } // problème réseau / serveur

export async function fetchDraft(token: string): Promise<DraftFetch> {
  try {
    const { data, error } = await supabase.functions.invoke(
      `get-draft?token=${encodeURIComponent(token)}`,
      { method: 'GET' },
    )
    if (error) {
      if (error instanceof FunctionsHttpError && [400, 404].includes(error.context.status)) {
        return { status: 'invalid' }
      }
      return { status: 'error' }
    }
    if (data?.ok && data.status === 'draft') {
      return {
        status: 'draft',
        compositionId: data.compositionId,
        couple: data.couple,
        formuleId: data.formuleId ?? null,
        lastStep: data.lastStep ?? null,
        clientState: data.clientState ?? null,
      }
    }
    if (data?.ok && data.status === 'submitted') return { status: 'submitted', menu: data.menu }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

export async function optOutOfReminders(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('draft-opt-out', { body: { token } })
    return !error && data?.ok === true
  } catch {
    return false
  }
}

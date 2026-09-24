import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Estimate } from '@core/pricing'
import { supabase } from './supabase'
import type { CoupleInfo } from '../context/CompositionContext'
import type { Selections } from '../types/db'

// Soumission d'un menu : UN SEUL appel à l'Edge Function submit-composition,
// qui valide, recalcule le prix, enregistre et envoie les emails.
// Le front n'écrit jamais directement dans les tables.

export interface SubmitInput {
  couple: CoupleInfo
  formuleId: string
  selections: Selections
  optionIds: string[]
  startedAt: number // début de la composition (horloge du navigateur)
  website: string // champ piège : toujours vide pour un humain
  turnstileToken: string | null
}

export type SubmitResult =
  | {
      ok: true
      compositionId: string
      shareToken: string
      emailSent: boolean
      estimate: Estimate
    }
  | { ok: false; errors: string[] }

const GENERIC_ERROR =
  "L'envoi a échoué. Vérifiez votre connexion et réessayez dans un instant."

export async function submitComposition(input: SubmitInput): Promise<SubmitResult> {
  const { data, error } = await supabase.functions.invoke('submit-composition', {
    body: {
      coupleNames: input.couple.coupleNames,
      email: input.couple.email,
      weddingDate: input.couple.weddingDate || null,
      guestCount: input.couple.guestCount,
      formuleId: input.formuleId,
      selections: input.selections,
      optionIds: input.optionIds,
      startedAt: input.startedAt,
      sentAt: Date.now(),
      website: input.website,
      turnstileToken: input.turnstileToken,
    },
  })

  if (error) {
    // Réponse d'erreur de la fonction (422 validation, 429 limite…) : on
    // récupère les messages en français qu'elle renvoie.
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as { errors?: unknown; error?: unknown }
        if (Array.isArray(body.errors) && body.errors.length > 0) {
          return { ok: false, errors: body.errors.map(String) }
        }
        if (typeof body.error === 'string' && body.error) {
          return { ok: false, errors: [body.error] }
        }
      } catch {
        // corps illisible : message générique
      }
    }
    return { ok: false, errors: [GENERIC_ERROR] }
  }

  if (data?.ok && typeof data.compositionId === 'string') {
    return {
      ok: true,
      compositionId: data.compositionId,
      shareToken: data.shareToken,
      emailSent: data.emailSent === true,
      estimate: data.estimate,
    }
  }
  return { ok: false, errors: [GENERIC_ERROR] }
}

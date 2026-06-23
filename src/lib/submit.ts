import { supabase } from './supabase'
import type { CoupleInfo } from '../context/CompositionContext'
import type { Selections } from '../types/db'

export interface SubmitResult {
  ok: boolean
  compositionId?: string
  total?: number
  emailResults?: Record<string, string>
  error?: string
}

// Appelle l'Edge Function `submit-composition` (enregistre + PDF + emails).
// Toute la logique sensible tourne côté serveur Supabase.
export async function submitComposition(
  couple: CoupleInfo,
  selections: Selections,
): Promise<SubmitResult> {
  const { data, error } = await supabase.functions.invoke('submit-composition', {
    body: {
      coupleNames: couple.coupleNames,
      email: couple.email,
      weddingDate: couple.weddingDate,
      guestCount: couple.guestCount,
      selections,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return data as SubmitResult
}

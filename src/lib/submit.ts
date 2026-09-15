import { supabase } from './supabase'
import type { CoupleInfo } from '../context/CompositionContext'
import type { Selections } from '../types/db'

export interface SubmitResult {
  ok: boolean
  compositionId?: string
  error?: string
}

// Enregistre la demande directement dans Supabase (insertion publique via RLS).
// C'est ce qui alimente le CRM du back-office. Puis on déclenche l'envoi des
// emails (récap couple + notification traiteur) via l'Edge Function, en
// best-effort : si l'email échoue, la demande est déjà enregistrée.
export async function submitComposition(
  couple: CoupleInfo,
  formuleId: string,
  selections: Selections,
  optionIds: string[],
  totalEstimate: number,
): Promise<SubmitResult> {
  const id = crypto.randomUUID()
  const itemIds = Object.keys(selections).filter((k) => (selections[k] ?? 0) > 0)

  const { error: compErr } = await supabase.from('compositions').insert({
    id,
    formule_id: formuleId,
    couple_names: couple.coupleNames,
    email: couple.email,
    wedding_date: couple.weddingDate || null,
    guest_count: couple.guestCount,
    status: 'submitted',
    total_estimate: totalEstimate,
  })
  if (compErr) return { ok: false, error: compErr.message }

  if (itemIds.length) {
    const { error } = await supabase.from('composition_items').insert(
      itemIds.map((item_id) => ({ composition_id: id, item_id, quantity: selections[item_id] })),
    )
    if (error) return { ok: false, error: error.message }
  }

  if (optionIds.length) {
    const { error } = await supabase.from('composition_options').insert(
      optionIds.map((option_id) => ({ composition_id: id, option_id })),
    )
    if (error) return { ok: false, error: error.message }
  }

  // Envoi des emails (couple + traiteur) via l'Edge Function. Best-effort :
  // on n'échoue pas le parcours si l'email ne part pas (demande déjà en base).
  try {
    await supabase.functions.invoke('submit-composition', {
      body: {
        coupleNames: couple.coupleNames,
        email: couple.email,
        weddingDate: couple.weddingDate || null,
        guestCount: couple.guestCount,
        formuleId,
        selections,
        optionIds,
      },
    })
  } catch {
    // silencieux : l'email est un bonus, la demande est déjà enregistrée
  }

  return { ok: true, compositionId: id }
}

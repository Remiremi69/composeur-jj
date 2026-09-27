// Menu envoyé en LECTURE SEULE : plats, options, « déjà compris » et
// estimation, SANS aucune donnée de contact (email, téléphone, lieu,
// allergies, message). Utilisé par get-draft (page /menu/:token) et
// menu-pdf (PDF partageable) : le lien d'un menu peut circuler.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import { computeEstimate } from './core/pricing.ts'
import type { Catalog, Selections } from './core/types.ts'
import { buildRecap, type RecapData } from './recap.ts'

export async function readOnlyMenu(
  admin: SupabaseClient,
  comp: { id: string; couple_names: string | null; wedding_date: string | null; guest_count: number | null; formule_id: string | null },
): Promise<RecapData> {
  const [formules, steps, items, options, compItems, compOptions] = await Promise.all([
    admin.from('formules').select('*'),
    admin.from('steps').select('*'),
    admin.from('items').select('*'),
    admin.from('options').select('*'),
    admin.from('composition_items').select('item_id, quantity').eq('composition_id', comp.id),
    admin.from('composition_options').select('option_id').eq('composition_id', comp.id),
  ])
  const error =
    formules.error ?? steps.error ?? items.error ?? options.error ?? compItems.error ?? compOptions.error
  if (error) throw new Error(`chargement du menu : ${error.message}`)

  const catalog: Catalog = {
    formules: formules.data ?? [],
    steps: steps.data ?? [],
    items: items.data ?? [],
    options: options.data ?? [],
  }
  const selections: Selections = {}
  for (const ci of compItems.data ?? []) selections[ci.item_id] = ci.quantity
  const optionIds = (compOptions.data ?? []).map((co) => co.option_id as string)
  const formule = catalog.formules.find((f) => f.id === comp.formule_id) ?? null
  const guestCount = comp.guest_count ?? 0

  const estimate = computeEstimate(formule, catalog.items, selections, catalog.options, optionIds, guestCount)
  return buildRecap(
    catalog,
    formule,
    {
      coupleNames: comp.couple_names ?? '',
      weddingDate: comp.wedding_date,
      guestCount,
      selections,
      optionIds,
      contact: null, // jamais de données de contact dans la vue partageable
    },
    estimate,
  )
}

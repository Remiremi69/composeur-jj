// Edge Function : get-draft
// GET ?token=… — reprise d'un menu ou affichage en lecture seule.
//
// • Brouillon : renvoie l'état saisi par le couple, pour reprise.
// • Menu envoyé : renvoie une vue en LECTURE SEULE (noms, date, convives,
//   formule, plats et options par étape, estimation). Aucun email, téléphone,
//   lieu ni message : cette page peut être partagée.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import { isShareToken } from '../_shared/core/draft.ts'
import { computeEstimate } from '../_shared/core/pricing.ts'
import type { Catalog, Selections } from '../_shared/core/types.ts'
import { adminClient, GENERIC_ERROR, guardRequest, json } from '../_shared/guard.ts'
import { buildRecap } from '../_shared/recap.ts'

Deno.serve(async (req) => {
  const guard = guardRequest(req, ['GET'])
  if (!guard.ok) return guard.response
  const { cors } = guard

  try {
    const token = new URL(req.url).searchParams.get('token')
    if (!isShareToken(token)) {
      return json({ ok: false, error: 'Ce lien n’est pas valide.' }, 400, cors)
    }

    const admin = adminClient()
    const { data: comp, error } = await admin
      .from('compositions')
      .select('id, status, couple_names, email, wedding_date, guest_count, formule_id, last_step, client_state')
      .eq('share_token', token)
      .maybeSingle()
    if (error) throw new Error(`lecture de la composition : ${error.message}`)
    if (!comp) return json({ ok: false, error: 'Ce lien n’est plus valide.' }, 404, cors)

    if (comp.status === 'draft') {
      // Uniquement ce que le couple a lui-même saisi.
      return json(
        {
          ok: true,
          status: 'draft',
          compositionId: comp.id,
          couple: {
            coupleNames: comp.couple_names ?? '',
            email: comp.email ?? '',
            weddingDate: comp.wedding_date ?? '',
            guestCount: comp.guest_count ?? 0,
          },
          formuleId: comp.formule_id,
          lastStep: comp.last_step,
          clientState: comp.client_state,
        },
        200,
        cors,
      )
    }

    return json({ ok: true, status: 'submitted', menu: await readOnlyMenu(admin, comp) }, 200, cors)
  } catch (e) {
    console.error('[get-draft] erreur inattendue :', e)
    return json({ ok: false, error: GENERIC_ERROR }, 500, cors)
  }
})

async function readOnlyMenu(
  admin: SupabaseClient,
  comp: { id: string; couple_names: string | null; wedding_date: string | null; guest_count: number | null; formule_id: string | null },
) {
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

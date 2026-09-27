// Edge Function : menu-pdf
// GET ?token=… — PDF d'un menu ENVOYÉ (status 'submitted'), téléchargé
// depuis la page de confirmation. Aucune donnée de contact : le lien du
// menu peut être partagé.

import { brandContact } from '../_shared/brand.ts'
import { isShareToken } from '../_shared/core/draft.ts'
import { adminClient, env, GENERIC_ERROR, guardRequest, json } from '../_shared/guard.ts'
import { readOnlyMenu } from '../_shared/menu.ts'
import { buildSharedMenuPdf } from './build.ts'

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
      .select('id, status, couple_names, wedding_date, guest_count, formule_id')
      .eq('share_token', token)
      .maybeSingle()
    if (error) throw new Error(`lecture de la composition : ${error.message}`)
    // Brouillon ou lien inconnu : pas de PDF.
    if (!comp || comp.status !== 'submitted') {
      return json({ ok: false, error: 'Ce menu n’est pas disponible.' }, 404, cors)
    }

    const pdf = await buildSharedMenuPdf(await readOnlyMenu(admin, comp), brandContact(env))
    return new Response(pdf, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="menu-mariage-jj-traiteur.pdf"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('[menu-pdf] erreur inattendue :', e)
    return json({ ok: false, error: GENERIC_ERROR }, 500, cors)
  }
})

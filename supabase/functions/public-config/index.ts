// Edge Function : public-config
// GET — informations publiques de configuration dont le site a besoin.
// Le téléphone de J&J n'existe qu'à UN endroit dans le projet : le secret
// TRAITEUR_PHONE (utilisé aussi par les relances). Cette fonction le lit et
// le transmet au site, sans jamais exposer autre chose.

import { env, guardRequest, json } from '../_shared/guard.ts'

Deno.serve((req) => {
  const guard = guardRequest(req, ['GET'])
  if (!guard.ok) return guard.response

  return json({ ok: true, traiteurPhone: env('TRAITEUR_PHONE') || null }, 200, {
    ...guard.cors,
    'Cache-Control': 'public, max-age=3600',
  })
})

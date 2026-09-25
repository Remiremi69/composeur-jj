// Edge Function : draft-opt-out
// Désinscription des relances pour un brouillon (reminders_opt_out = vrai).
//
// Deux appelants :
// • la page /desinscription/:token du Composeur (bouton « Confirmer ») ;
// • les messageries (Gmail…) via l'en-tête List-Unsubscribe en « un clic »
//   (RFC 8058) : POST sans origine de navigateur ni jeton Supabase.
// Le jeton de partage (UUID, impossible à deviner) sert d'autorisation.
// Uniquement en POST : un simple chargement du lien (antivirus, aperçu)
// ne désinscrit personne.
// Déployée sans vérification JWT (verify_jwt = false, cf. config.toml).

import { isShareToken } from '../_shared/core/draft.ts'
import {
  adminClient,
  corsHeaders,
  GENERIC_ERROR,
  isOriginAllowed,
  json,
  normalizeOrigin,
  readBodyLimited,
} from '../_shared/guard.ts'

Deno.serve(async (req) => {
  // Origine : absente (messagerie) = accepté ; présente = doit être autorisée.
  const origin = normalizeOrigin(req.headers.get('origin'))
  if (origin !== '' && !isOriginAllowed(origin)) {
    return json({ ok: false, error: 'Origine non autorisée.' }, 403)
  }
  const cors = origin !== '' ? corsHeaders(origin, ['POST']) : {}
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée.' }, 405, cors)

  try {
    // Jeton : dans l'URL (List-Unsubscribe) ou dans le corps JSON (page du site).
    let token: unknown = new URL(req.url).searchParams.get('token')
    const { text, tooLarge } = await readBodyLimited(req, 4 * 1024)
    if (tooLarge) return json({ ok: false, error: 'La requête est trop volumineuse.' }, 413, cors)
    if (!isShareToken(token) && text.trim().startsWith('{')) {
      try {
        token = (JSON.parse(text) as { token?: unknown }).token
      } catch {
        // corps illisible : jeton absent
      }
    }
    if (!isShareToken(token)) {
      return json({ ok: false, error: 'Ce lien n’est pas valide.' }, 400, cors)
    }

    const { error } = await adminClient()
      .from('compositions')
      .update({ reminders_opt_out: true })
      .eq('share_token', token)
    if (error) throw new Error(`désinscription : ${error.message}`)

    // Même réponse que le jeton existe ou non : rien n'est révélé.
    return json({ ok: true }, 200, cors)
  } catch (e) {
    console.error('[draft-opt-out] erreur inattendue :', e)
    return json({ ok: false, error: GENERIC_ERROR }, 500, cors)
  }
})

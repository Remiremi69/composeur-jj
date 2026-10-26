import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

// Connexion du traiteur sans mot de passe (lot 7) : un email contient un CODE
// à 6 chiffres et un LIEN. Le code est indispensable sur iPhone quand l'espace
// est installé sur l'écran d'accueil : le lien s'ouvrirait dans Safari, qui ne
// partage pas la connexion avec l'application installée.
// shouldCreateUser: false → seuls les comptes déjà créés reçoivent un email ;
// le message est le même dans tous les cas (on ne révèle pas qui a un compte).
// La session est conservée par le navigateur : on reste connecté.
export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!address) return setError('Indiquez votre adresse email.')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` },
    })
    setLoading(false)
    // Adresse inconnue : même écran que pour une adresse autorisée.
    if (error && error.status === 429) return setError('Trop de demandes. Patientez une minute puis réessayez.')
    setSent(true)
  }

  async function checkCode(e: FormEvent) {
    e.preventDefault()
    const token = code.replace(/\D/g, '')
    if (token.length !== 6) return setError('Le code contient 6 chiffres.')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    setLoading(false)
    if (error) setError('Ce code ne fonctionne pas ou a expiré. Demandez-en un nouveau.')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12 text-base">
      <p className="text-sm uppercase tracking-[0.2em] text-slate">J&amp;J Traiteur</p>
      <h1 className="mt-2 text-3xl text-slate">Espace traiteur</h1>

      {!sent ? (
        <>
          <p className="mt-2 text-muted">Recevez un code de connexion par email, sans mot de passe.</p>
          <form onSubmit={sendLink} className="mt-8 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium text-ink">Votre email</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="username"
              />
            </label>
            {error && <p className="text-error">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="min-h-12 rounded-card bg-slate px-6 py-3.5 font-semibold text-lin transition-colors hover:bg-slate-deep disabled:opacity-60"
            >
              {loading ? 'Envoi…' : 'Recevoir mon code'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-4 rounded-card border border-lin bg-fond p-4 text-ink" role="status">
            Si cette adresse est autorisée, vous allez recevoir un lien de connexion.
          </p>
          <p className="mt-4 text-muted">
            L’email contient aussi un code à 6 chiffres : tapez-le ici, ou touchez le lien de l’email.
          </p>
          <form onSubmit={checkCode} className="mt-6 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium text-ink">Code reçu par email</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input text-center text-2xl tracking-[0.4em]"
                placeholder="••••••"
              />
            </label>
            {error && <p className="text-error">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="min-h-12 rounded-card bg-slate px-6 py-3.5 font-semibold text-lin transition-colors hover:bg-slate-deep disabled:opacity-60"
            >
              {loading ? 'Vérification…' : 'Me connecter'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setCode('')
                setError(null)
              }}
              className="min-h-11 text-muted underline underline-offset-2 hover:text-ink"
            >
              Changer d’adresse ou renvoyer un code
            </button>
          </form>
        </>
      )}
    </div>
  )
}

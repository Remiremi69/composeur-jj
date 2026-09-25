import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useComposition } from '../context/CompositionContext'
import { fetchDraft } from '../lib/drafts'

// Page d'arrivée d'un lien de reprise (/reprendre/:token), par exemple depuis
// l'email de relance. Brouillon → on restaure tout et on renvoie à la
// dernière étape. Menu déjà envoyé → page menu en lecture seule.
export default function ResumePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { resumeDraft } = useComposition()
  const [state, setState] = useState<'loading' | 'invalid' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setState('invalid')
      return
    }
    setState('loading')
    fetchDraft(token).then((r) => {
      if (cancelled) return
      if (r.status === 'submitted') {
        navigate(`/menu/${token}`, { replace: true })
      } else if (r.status === 'draft') {
        const cs = r.clientState ?? {}
        const currentStep = cs.currentStep ?? r.lastStep ?? null
        resumeDraft({
          shareToken: token,
          compositionId: r.compositionId,
          couple: { ...r.couple, weddingDate: r.couple.weddingDate ?? '' },
          formuleId: r.formuleId,
          currentStep,
          selections: cs.selections ?? {},
          optionIds: cs.optionIds ?? [],
        })
        navigate(routeForStep(currentStep, r.formuleId), { replace: true })
      } else {
        setState(r.status)
      }
    })
    return () => {
      cancelled = true
    }
  }, [token, attempt, navigate, resumeDraft])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">J&amp;J Traiteur</p>
      {state === 'loading' && <p className="mt-4 text-muted">Nous retrouvons votre menu…</p>}
      {state === 'invalid' && (
        <>
          <h1 className="mt-2 font-display text-3xl text-ink">Lien introuvable</h1>
          <p className="mt-3 text-muted">
            Ce lien n’est plus valide. Vous pouvez composer un nouveau menu en quelques minutes.
          </p>
          <Link
            to="/"
            className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-cream transition-colors hover:bg-accent-dark"
          >
            Composer un menu
          </Link>
        </>
      )}
      {state === 'error' && (
        <>
          <h1 className="mt-2 font-display text-3xl text-ink">Un petit contretemps</h1>
          <p className="mt-3 text-muted">
            Impossible de récupérer votre menu pour le moment. Réessayez dans un instant.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-cream transition-colors hover:bg-accent-dark"
          >
            Réessayer
          </button>
        </>
      )}
    </div>
  )
}

// Où reprendre selon la dernière étape enregistrée.
function routeForStep(step: string | null, formuleId: string | null): string {
  if (!formuleId || !step || step === 'formule' || step === 'accueil') return '/formule'
  if (step === 'options') return '/options'
  if (step === 'recap') return '/recap'
  return '/composer'
}

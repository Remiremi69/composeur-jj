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
    <div className="mx-auto flex w-full flex-1 max-w-md flex-col items-center justify-center px-6 text-center">
      {state === 'loading' && <p className="mt-4 text-muted">Nous retrouvons votre menu…</p>}
      {state === 'invalid' && (
        <>
          <h1 className="mt-2 font-display text-3xl text-slate">Lien introuvable</h1>
          <p className="mt-3 text-muted">
            Ce lien n’est plus valide. Vous pouvez composer un nouveau menu en quelques minutes.
          </p>
          <Link
            to="/"
            className="mt-6 rounded-card bg-slate px-6 py-3 font-semibold text-lin transition-colors hover:bg-slate-deep"
          >
            Composer un menu
          </Link>
        </>
      )}
      {state === 'error' && (
        <>
          <h1 className="mt-2 font-display text-3xl text-slate">Un petit contretemps</h1>
          <p className="mt-3 text-muted">
            Impossible de récupérer votre menu pour le moment. Réessayez dans un instant.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-6 rounded-card bg-slate px-6 py-3 font-semibold text-lin transition-colors hover:bg-slate-deep"
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

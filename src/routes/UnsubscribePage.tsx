import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isShareToken } from '@core/draft'
import { optOutOfReminders } from '../lib/drafts'

// Désinscription des rappels (/desinscription/:token). Un bouton de
// confirmation évite qu'un simple chargement du lien (antivirus, aperçu de
// la messagerie) ne désinscrive le couple à son insu.
export default function UnsubscribePage() {
  const { token } = useParams()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const valid = isShareToken(token)

  async function confirm() {
    if (!valid || !token) return
    setState('sending')
    setState((await optOutOfReminders(token)) ? 'done' : 'error')
  }

  return (
    <div className="mx-auto flex w-full flex-1 max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl text-slate">Rappels par email</h1>

      {!valid ? (
        <p className="mt-3 text-muted">Ce lien n’est pas valide.</p>
      ) : state === 'done' ? (
        <p className="mt-3 text-muted">
          C’est noté : vous ne recevrez plus de rappel au sujet de ce menu.
        </p>
      ) : (
        <>
          <p className="mt-3 text-muted">
            Vous ne souhaitez plus recevoir de rappel au sujet de votre menu en cours ?
          </p>
          {state === 'error' && (
            <p role="alert" className="mt-3 text-sm text-slate">
              La désinscription n’a pas pu être enregistrée. Réessayez dans un instant.
            </p>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={state === 'sending'}
            className="mt-6 rounded-card bg-slate px-6 py-3 font-semibold text-lin transition-colors hover:bg-slate-deep disabled:opacity-60"
          >
            {state === 'sending' ? 'Enregistrement…' : 'Confirmer'}
          </button>
        </>
      )}

      <Link to="/" className="mt-8 text-sm font-medium text-muted hover:text-ink">
        Revenir au Composeur
      </Link>
    </div>
  )
}

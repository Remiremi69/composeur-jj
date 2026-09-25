import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'

export default function ConfirmationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { couple, reset, submittedToken } = useComposition()
  // Transmis par la page récap : l'email récapitulatif est-il bien parti ?
  // undefined = inconnu (page rechargée) : on ne promet rien.
  const navState = location.state as { emailSent?: boolean; shareToken?: string } | null
  const emailSent = navState?.emailSent
  // Lien du menu en lecture seule (partageable, sans données de contact).
  const menuToken = navState?.shareToken ?? submittedToken

  function startOver() {
    reset()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-cream">
          ✓
        </div>
        <h1 className="mt-6 text-3xl text-ink">Merci{couple ? `, ${couple.coupleNames}` : ''} !</h1>
        {emailSent === true ? (
          <>
            <p className="mt-3 text-muted">
              Votre menu a bien été envoyé. Vous le recevez par email
              {couple?.email ? ` (${couple.email})` : ''}, accompagné du récapitulatif en PDF.
            </p>
            <p className="mt-2 text-muted">
              Votre traiteur J&amp;J l'a également reçu et reviendra vers vous pour affiner
              et confirmer votre devis.
            </p>
          </>
        ) : emailSent === false ? (
          <p className="mt-3 text-muted">
            Votre menu est bien enregistré et J&amp;J l'a reçu. L'email récapitulatif n'a
            pas pu partir, nous vous le renverrons.
          </p>
        ) : (
          <p className="mt-3 text-muted">
            Votre menu est bien enregistré et J&amp;J l'a reçu. Votre traiteur reviendra vers
            vous pour affiner et confirmer votre devis.
          </p>
        )}

        {menuToken && (
          <Link
            to={`/menu/${menuToken}`}
            className="mt-6 inline-block rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent"
          >
            Voir notre menu en ligne
          </Link>
        )}

        <div className="mt-8 rounded-card border border-line bg-surface p-6 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Prochaine étape</p>
          <h2 className="mt-1 font-display text-xl text-ink">La dégustation</h2>
          <p className="mt-2 text-sm text-muted">
            Venez déguster votre grand soir en avant-première : nous reproduisons votre
            menu à l'identique. <span className="text-ink">40 € par personne</span>, déduits
            de votre facture si vous confirmez votre mariage avec nous.
          </p>
        </div>

        <button
          type="button"
          onClick={startOver}
          className="mt-8 rounded-full px-6 py-3 font-medium text-muted hover:text-ink"
        >
          Recommencer une composition
        </button>
      </motion.div>
    </div>
  )
}

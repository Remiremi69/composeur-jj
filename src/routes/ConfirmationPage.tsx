import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { telHref } from '../lib/format'
import { downloadMenuPdf } from '../lib/menuPdf'
import { appUrl, BOOKING_URL, CONFIRMATION_MESSAGE, shareText } from '../config/brand'

// Après l'envoi : on dit clairement ce qui se passe, puis on propose la
// suite (dégustation, partage, PDF) au lieu d'une page sans issue.
export default function ConfirmationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { couple, reset, submittedToken } = useComposition()
  const { traiteurPhone } = useCatalog()
  // Transmis par la page récap : l'email récapitulatif est-il bien parti ?
  // undefined = inconnu (page rechargée) : on ne promet rien.
  const navState = location.state as { emailSent?: boolean; shareToken?: string } | null
  const emailSent = navState?.emailSent
  // Lien du menu en lecture seule (partageable, sans données de contact).
  const menuToken = navState?.shareToken ?? submittedToken
  const menuLink = menuToken ? `${appUrl()}/menu/${menuToken}` : null

  function startOver() {
    reset()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bronze text-2xl text-ink"
        >
          ✓
        </div>
        <h1 className="mt-5 text-3xl sm:text-4xl">Merci {couple?.coupleNames ?? ''} !</h1>
        <p className="mt-3 text-lg text-ink">{CONFIRMATION_MESSAGE}</p>
        <p className="mt-2 text-sm text-muted">
          {emailSent === true
            ? `Le récapitulatif vous a été envoyé par email${couple?.email ? ` (${couple.email})` : ''}, avec le PDF.`
            : emailSent === false
              ? 'L’email récapitulatif n’a pas pu partir : nous vous le renverrons.'
              : 'Votre menu est bien enregistré.'}
        </p>
      </motion.div>

      {/* Prochaine étape : la dégustation (bloc principal) */}
      <section
        aria-labelledby="degustation"
        className="mt-8 rounded-card border border-lin bg-fond p-6"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="mb-3 h-px w-10 bg-bronze" aria-hidden="true" />
        <h2 id="degustation" className="text-2xl">
          Prochaine étape : la dégustation
        </h2>
        <p className="mt-2 text-ink">
          Venez déguster votre grand soir en avant-première : nous reproduisons votre menu à
          l'identique. <strong>40 € par personne</strong>, déduits de votre facture si vous
          confirmez votre mariage avec nous.
        </p>
        <CallToAction phone={traiteurPhone} />
      </section>

      {/* Partager le menu */}
      {menuToken && menuLink && (
        <section aria-labelledby="partager" className="mt-6 rounded-card border border-lin bg-fond p-6">
          <h2 id="partager" className="text-xl">
            Partager votre menu
          </h2>
          <p className="mt-1 text-sm text-muted">
            Avec vos proches, vos témoins… Le lien ne montre que le menu, sans vos coordonnées.
          </p>
          <ShareButtons link={menuLink} />
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-lin pt-4 text-sm">
            <Link to={`/menu/${menuToken}`} className="font-bold text-slate underline-offset-4 hover:underline">
              Voir notre menu en ligne
            </Link>
            <PdfButton token={menuToken} />
          </div>
        </section>
      )}

      <p className="mt-10 text-center">
        <button
          type="button"
          onClick={startOver}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Recommencer une composition
        </button>
      </p>
    </div>
  )
}

const primaryButton =
  'mt-5 inline-flex w-full items-center justify-center rounded-card bg-slate px-6 py-3.5 font-bold text-lin transition-colors hover:bg-slate-deep sm:w-auto'
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-card border border-slate px-4 py-2.5 text-sm font-bold text-slate transition-colors hover:bg-lin-light'

// « Réserver un appel » (VITE_BOOKING_URL) ; sinon « Nous appeler ».
function CallToAction({ phone }: { phone: string | null }) {
  if (BOOKING_URL) {
    return (
      <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={primaryButton}>
        Réserver un appel
        <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
      </a>
    )
  }
  if (!phone) return null
  return (
    <a href={`tel:${telHref(phone)}`} className={primaryButton}>
      Nous appeler · {phone}
    </a>
  )
}

function ShareButtons({ link }: { link: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const text = shareText(link)
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: 'Notre menu de mariage', text })
    } catch {
      // partage annulé : rien à faire
    }
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={secondaryButton}>
          Copier le lien
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButton}
        >
          WhatsApp
          <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
        </a>
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={secondaryButton}>
            Partager…
          </button>
        )}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {copyState === 'copied' && <span className="text-ink">Lien copié ✓</span>}
        {copyState === 'failed' && (
          <span className="text-ink">
            Copie impossible, voici le lien : <span className="break-all font-bold">{link}</span>
          </span>
        )}
      </p>
    </>
  )
}

function PdfButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  async function download() {
    setState('loading')
    setState((await downloadMenuPdf(token)) ? 'idle' : 'error')
  }
  return (
    <span>
      <button
        type="button"
        onClick={download}
        disabled={state === 'loading'}
        className="font-bold text-slate underline-offset-4 hover:underline disabled:opacity-60"
      >
        {state === 'loading' ? 'Préparation du PDF…' : 'Télécharger le PDF'}
      </button>
      <span aria-live="polite" className="ml-2 text-error">
        {state === 'error' && 'Le PDF n’a pas pu être préparé, réessayez.'}
      </span>
    </span>
  )
}

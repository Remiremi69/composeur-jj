import { useState } from 'react'
import type { Composition } from '../../types/db'
import { appUrl } from '../../config/brand'
import { configuratorLink, inviteMessage, mailtoHref, smsHref, whatsappMessageHref } from '../../lib/contacts'
import { copyText } from '../../lib/clipboard'

// « Envoyer le configurateur » : le lien personnel de CETTE fiche, prêt à
// partir par WhatsApp, SMS ou email. Le couple y compose son menu ; à l'envoi,
// la même fiche se remplit (une seule fiche par couple).
export default function SendConfigurator({ composition: c, onClose }: { composition: Composition; onClose: () => void }) {
  const link = configuratorLink(appUrl(), c.share_token, c.source)
  const message = inviteMessage(c.couple_names, link)
  const [copied, setCopied] = useState(false)

  async function copy() {
    setCopied(await copyText(link))
    setTimeout(() => setCopied(false), 2500)
  }

  const shape = 'flex min-h-12 items-center justify-center rounded-card border border-slate px-4 text-base font-bold'
  const btn = `${shape} text-slate hover:bg-lin-light`
  const primary = `${shape} bg-slate text-lin hover:bg-slate-deep`
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="envoyer-titre"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-card bg-fond p-5 pb-8 shadow-xl sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="envoyer-titre" className="font-display text-xl text-slate">
          Envoyer le configurateur
        </h2>
        <p className="mt-1 text-base text-muted">à {c.couple_names || 'ce contact'}</p>
        <p className="mt-3 rounded-card bg-lin-light p-3 text-base text-ink">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={whatsappMessageHref(c.phone, message)} target="_blank" rel="noopener noreferrer" className={primary}>
            WhatsApp
          </a>
          <a href={smsHref(c.phone, message)} className={btn}>
            SMS
          </a>
          <a href={mailtoHref(c.email, 'Votre menu de mariage avec J&J Traiteur', message)} className={btn}>
            Email
          </a>
          <button type="button" onClick={copy} className={btn} aria-live="polite">
            {copied ? 'Lien copié ✓' : 'Copier le lien'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-4 min-h-11 w-full text-base text-muted underline">
          Fermer
        </button>
      </div>
    </div>
  )
}

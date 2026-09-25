import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Turnstile } from '@marsidev/react-turnstile'
import {
  GUESTS_MAX,
  GUESTS_MIN,
  coupleInfoFieldErrors,
  isDateSoon,
  type CoupleField,
} from '@core/validation'
import FormField from '../components/FormField'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'

// Clé publique Cloudflare Turnstile : protège la création du brouillon
// (qui peut donner lieu à un email de rappel). Widget absent si non définie.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

// Date du jour (heure locale) au format AAAA-MM-JJ, pour le champ date.
function todayLocalIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function AccueilPage() {
  const navigate = useNavigate()
  const { couple, setCouple, startDraft } = useComposition()
  // Numéro de J&J : même source que les relances (secret TRAITEUR_PHONE).
  const { traiteurPhone } = useCatalog()
  // Jeton anti-robot pour la création du brouillon. Jamais bloquant : sans
  // jeton, le couple continue normalement (seule la sauvegarde est sautée).
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const [coupleNames, setCoupleNames] = useState(couple?.coupleNames ?? '')
  const [weddingDate, setWeddingDate] = useState(couple?.weddingDate ?? '')
  const [guestCount, setGuestCount] = useState(
    couple?.guestCount ? String(couple.guestCount) : '',
  )
  const [email, setEmail] = useState(couple?.email ?? '')
  const [errors, setErrors] = useState<Partial<Record<CoupleField, string>>>({})

  // Modifier un champ efface son erreur (et seulement la sienne).
  function update(field: CoupleField, set: (v: string) => void, value: string) {
    set(value)
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const guests = Number(guestCount)

    // Mêmes règles que le serveur (noyau partagé) : le couple est prévenu
    // dès l'accueil plutôt qu'au moment d'envoyer son menu.
    const found = coupleInfoFieldErrors({ coupleNames, email, weddingDate, guestCount: guests })
    setErrors(found)
    const first = (['coupleNames', 'weddingDate', 'guestCount', 'email'] as const).find((f) => found[f])
    if (first) {
      // Place le curseur sur le premier champ en erreur.
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`)
      el?.focus()
      return
    }

    setCouple({
      coupleNames: coupleNames.trim(),
      email: email.trim(),
      weddingDate,
      guestCount: guests,
    })
    // Le brouillon est créé côté serveur à la sauvegarde qui suit.
    startDraft(turnstileToken)
    navigate('/formule')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm uppercase tracking-[0.2em] text-accent">J&amp;J Traiteur</p>
        <h1 className="mt-3 text-4xl leading-tight text-ink">
          Composez le menu de votre mariage
        </h1>
        <p className="mt-3 text-muted">
          Quelques instants à deux pour imaginer votre repas. Commençons par faire
          connaissance.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <FormField label="Vos prénoms" required error={errors.coupleNames}>
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                autoComplete="name"
                value={coupleNames}
                data-field="coupleNames"
                onChange={(e) => update('coupleNames', setCoupleNames, e.target.value)}
                placeholder="Camille & Alex"
                className="input"
              />
            )}
          </FormField>

          <FormField
            label="Date du mariage"
            optional
            error={errors.weddingDate}
            warning={
              !errors.weddingDate && isDateSoon(weddingDate) ? (
                <>
                  Date proche : appelez-nous pour vérifier nos disponibilités
                  {traiteurPhone ? (
                    <>
                      {' au '}
                      <a
                        href={`tel:${traiteurPhone.replace(/[^+\d]/g, '')}`}
                        className="whitespace-nowrap font-medium text-accent underline underline-offset-2"
                      >
                        {traiteurPhone}
                      </a>
                    </>
                  ) : null}
                  .
                </>
              ) : undefined
            }
          >
            {(a11y) => (
              <input
                {...a11y}
                type="date"
                autoComplete="off"
                min={todayLocalIso()}
                value={weddingDate}
                data-field="weddingDate"
                onChange={(e) => update('weddingDate', setWeddingDate, e.target.value)}
                className="input"
              />
            )}
          </FormField>

          <FormField label="Nombre de convives" required error={errors.guestCount}>
            {(a11y) => (
              <input
                {...a11y}
                type="number"
                inputMode="numeric"
                autoComplete="off"
                min={GUESTS_MIN}
                max={GUESTS_MAX}
                value={guestCount}
                data-field="guestCount"
                onChange={(e) => update('guestCount', setGuestCount, e.target.value)}
                placeholder="120"
                className="input"
              />
            )}
          </FormField>

          <FormField
            label="Votre email"
            required
            error={errors.email}
            hint="Pour enregistrer votre menu, vous l’envoyer, et vous le rappeler si vous ne l’avez pas terminé. Pas de publicité."
          >
            {(a11y) => (
              <input
                {...a11y}
                type="email"
                autoComplete="email"
                value={email}
                data-field="email"
                onChange={(e) => update('email', setEmail, e.target.value)}
                placeholder="vous@exemple.fr"
                className="input"
              />
            )}
          </FormField>

          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                options={{ language: 'fr', theme: 'light' }}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>
          )}

          <button
            type="submit"
            className="mt-2 rounded-full bg-accent px-6 py-3.5 font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(140,106,63,0.65)] transition-colors hover:bg-accent-dark"
          >
            Composer notre menu
          </button>
        </form>

        <div className="mt-10 border-t border-line pt-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Comment ça marche</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {[
              ['Composer', 'Vous composez votre menu ici, à votre goût.'],
              ['Contact', 'Nous vous recontactons pour convenir d’un rendez-vous.'],
              ['Dégustation', 'Vous dégustez votre grand soir en avant-première.'],
              ['Contrat', 'On finalise votre devis, puis votre contrat.'],
            ].map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-cream">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { itemsForStep } from '../lib/rules'
import { computeEstimate } from '../lib/pricing'
import { formatDate, formatPrice } from '../lib/format'
import { submitComposition } from '../lib/submit'
import InclusionsPanel from '../components/InclusionsPanel'

// Clé publique Cloudflare Turnstile : le widget n'apparaît que si elle est définie.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export default function RecapPage() {
  const navigate = useNavigate()
  const { couple, formuleId, selections, optionIds, startedAt } = useComposition()
  const { formules, steps, items, options, inclusions, loading } = useCatalog()
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<string[]>([])
  // Anti-spam : champ piège (toujours vide pour un humain), horodatage de
  // repli si le début de composition n'est pas connu, jeton Turnstile.
  const [website, setWebsite] = useState('')
  const [mountedAt] = useState(() => Date.now())
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>()

  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
    else if (!formuleId) navigate('/formule', { replace: true })
  }, [couple, formuleId, navigate])

  if (!couple || !formuleId) return null
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Chargement…
      </div>
    )
  }

  const formule = formules.find((f) => f.id === formuleId) ?? null
  const activeSteps = formule
    ? steps.filter((s) => formule.included_steps.includes(s.slug))
    : steps
  // Même calcul que le serveur : le prix affiché est le prix enregistré.
  const estimate = computeEstimate(
    formule,
    items,
    selections,
    options,
    optionIds,
    couple.guestCount,
  )
  const needsTurnstile = Boolean(TURNSTILE_SITE_KEY)
  const chosenOptions = options.filter((o) => optionIds.includes(o.id))

  async function handleSubmit() {
    if (!couple || !formuleId) return
    setSubmitting(true)
    setSubmitErrors([])
    const result = await submitComposition({
      couple,
      formuleId,
      selections,
      optionIds,
      startedAt: startedAt ?? mountedAt,
      website,
      turnstileToken,
    })
    setSubmitting(false)
    if (result.ok) {
      navigate('/confirmation', { state: { emailSent: result.emailSent } })
      return
    }
    setSubmitErrors(result.errors)
    // Un jeton Turnstile ne sert qu'une fois : on en redemande un.
    if (needsTurnstile) {
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* En-tête de menu */}
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Votre menu</p>
          <h1 className="mt-2 text-4xl text-ink">{couple.coupleNames}</h1>
          <p className="mt-2 text-muted">
            {couple.weddingDate && `${formatDate(couple.weddingDate)} · `}
            {couple.guestCount} convives
          </p>
          {formule && (
            <p className="mt-3 inline-block rounded-full bg-cream px-4 py-1 text-sm text-accent">
              {formule.name}
            </p>
          )}
        </header>

        <div className="my-8 flex items-center justify-center gap-3 text-accent">
          <span className="h-px w-12 bg-line" />
          <span>✦</span>
          <span className="h-px w-12 bg-line" />
        </div>

        {/* Le menu, étape par étape */}
        <div className="flex flex-col gap-8">
          {activeSteps.map((step) => {
            const chosen = itemsForStep(step, items).filter(
              (it) => (selections[it.id] ?? 0) > 0,
            )
            if (chosen.length === 0) return null

            return (
              <section key={step.id} className="text-center">
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted">{step.title}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {chosen.map((it) => (
                    <li key={it.id}>
                      <p className="font-display text-lg text-ink">
                        {it.name}
                        {it.supplement > 0 && (
                          <span className="text-muted"> · + {formatPrice(it.supplement)}/pers</span>
                        )}
                      </p>
                      {it.description && (
                        <p className="mx-auto max-w-md text-sm text-muted">{it.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        {/* Options choisies */}
        {chosenOptions.length > 0 && (
          <section className="mt-8 text-center">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Vos options</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {chosenOptions.map((o) => (
                <li key={o.id}>
                  <p className="font-display text-lg text-ink">
                    {o.name}
                    <span className="text-muted">
                      {' '}
                      ·{' '}
                      {o.price_unit === 'par_personne'
                        ? `${formatPrice(o.price)}/pers`
                        : `${formatPrice(o.price)} forfait`}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Estimation */}
        <div className="mt-10 rounded-card border border-line bg-surface p-6 text-center">
          <p className="text-sm text-muted">Estimation</p>
          <p className="mt-1 font-display text-3xl text-ink">
            {formatPrice(estimate.perPersonAllIn)}
            <span className="ml-1 text-base font-normal text-muted">par personne</span>
          </p>
          <p className="mt-2 text-xs text-muted">
            Estimation indicative — votre traiteur J&amp;J vous confirmera le devis définitif.
          </p>
        </div>

        {/* Ce qui est toujours compris */}
        {inclusions.length > 0 && (
          <div className="mt-6">
            <InclusionsPanel inclusions={inclusions} />
          </div>
        )}

        {/* Champ piège anti-robot : invisible et inaccessible pour un humain */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
        >
          <label htmlFor="website">Ne pas remplir</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          {submitErrors.length > 0 && (
            <div
              role="alert"
              className="rounded-card border border-accent/40 bg-surface p-4 text-left text-sm text-ink"
            >
              <p className="font-medium text-accent">Votre menu n'a pas pu être envoyé :</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {submitErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {needsTurnstile && (
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY as string}
                options={{ language: 'fr', theme: 'light' }}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (needsTurnstile && !turnstileToken)}
            className="rounded-full bg-accent px-6 py-3.5 font-semibold text-cream transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Envoi en cours…' : 'Envoyer à notre traiteur'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/composer')}
            disabled={submitting}
            className="rounded-full px-6 py-3 font-medium text-muted hover:text-ink disabled:opacity-60"
          >
            Modifier notre menu
          </button>
        </div>
      </motion.div>
    </div>
  )
}

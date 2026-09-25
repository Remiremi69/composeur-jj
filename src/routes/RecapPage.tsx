import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import {
  MAX_DIETARY_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_VENUE_LENGTH,
  contactInfoFieldErrors,
  normalizePhone,
  type ContactField,
} from '@core/validation'
import { buildScreens, freeSteps } from '@core/journey'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { itemsForStep } from '../lib/rules'
import { computeEstimate } from '../lib/pricing'
import { formatDate, formatPhone, optionPriceLabel } from '../lib/format'
import { submitComposition } from '../lib/submit'
import FormField from '../components/FormField'
import IncludedInFormule from '../components/IncludedInFormule'
import InclusionsPanel from '../components/InclusionsPanel'
import MenuView from '../components/MenuView'
import PriceSummary from '../components/PriceSummary'
import { MenuSkeleton } from '../components/Skeletons'

// Clé publique Cloudflare Turnstile : le widget n'apparaît que si elle est définie.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
// Politique de confidentialité (site vitrine de J&J).
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL as string | undefined

export default function RecapPage() {
  const navigate = useNavigate()
  const {
    couple,
    formuleId,
    selections,
    optionIds,
    startedAt,
    contact,
    setContact,
    shareToken,
    setCurrentStep,
    markSubmitted,
  } = useComposition()
  const { formules, steps, items, options, inclusions, loading } = useCatalog()
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<string[]>([])
  // Erreurs du bloc « Pour vous recontacter », affichées sous chaque champ.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>({})
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

  // Dernière étape atteinte (pour la reprise et la relance).
  useEffect(() => {
    setCurrentStep('recap')
  }, [setCurrentStep])

  // Dès que le couple corrige ses informations, on retire les anciennes erreurs.
  useEffect(() => {
    setSubmitErrors([])
  }, [contact])

  // Saisie d'un champ : on efface l'erreur de CE champ uniquement.
  function update(field: ContactField, value: string) {
    setContact({ [field]: value })
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  if (!couple || !formuleId) return null
  if (loading) return <MenuSkeleton />

  const formule = formules.find((f) => f.id === formuleId) ?? null
  // Même calcul que le serveur : le prix affiché est le prix enregistré.
  const estimate = computeEstimate(formule, items, selections, options, optionIds, couple.guestCount)
  const needsTurnstile = Boolean(TURNSTILE_SITE_KEY)

  // Une section par étape, avec un lien « Modifier » vers son écran.
  const sections = buildScreens(formule, steps).flatMap((screen) =>
    screen.steps
      .map((step) => ({
        title: step.title,
        editTo: `/composer/${screen.slug}`,
        lines: itemsForStep(step, items)
          .filter((it) => (selections[it.id] ?? 0) > 0)
          .map((it) => ({
            name: it.name,
            description: it.description,
            supplement: it.supplement,
            quantity: selections[it.id],
          })),
      }))
      .filter((s) => s.lines.length > 0),
  )
  // Étapes sans choix : « Déjà compris dans votre formule ».
  const included = freeSteps(formule, steps)
    .map((step) => ({
      title: step.title,
      items: itemsForStep(step, items).map((it) => ({ name: it.name, description: it.description })),
    }))
    .filter((g) => g.items.length > 0)
  const chosenOptions = options
    .filter((o) => optionIds.includes(o.id))
    .map((o) => ({ name: o.name, priceLabel: optionPriceLabel(o) }))

  async function handleSubmit() {
    if (!couple || !formuleId) return
    // Mêmes règles que le serveur, vérifiées avant d'envoyer (sous chaque champ).
    const errors = contactInfoFieldErrors(contact)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Place le curseur sur le premier champ en erreur.
      const first = (['phone', 'venue', 'dietaryNotes', 'message'] as const).find((f) => errors[f])
      document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()
      return
    }
    setSubmitting(true)
    setSubmitErrors([])
    const result = await submitComposition({
      couple,
      formuleId,
      selections,
      optionIds,
      contact,
      shareToken,
      startedAt: startedAt ?? mountedAt,
      website,
      turnstileToken,
    })
    setSubmitting(false)
    if (result.ok) {
      markSubmitted(result.shareToken)
      navigate('/confirmation', {
        state: { emailSent: result.emailSent, shareToken: result.shareToken },
      })
      return
    }
    setSubmitErrors(result.errors)
    // Un jeton Turnstile ne sert qu'une fois : on en redemande un.
    if (needsTurnstile) {
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    }
  }

  // Affiche le numéro sous sa forme normalisée dès qu'il est valide.
  function tidyPhone() {
    const normalized = normalizePhone(contact.phone)
    if (normalized) setContact({ phone: formatPhone(normalized) })
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

        {/* Le menu, étape par étape (avec « Modifier »), puis les options */}
        <MenuView sections={sections} options={chosenOptions} optionsEditTo="/options" />

        {/* Déjà compris dans la formule (étapes sans choix) */}
        {included.length > 0 && (
          <div className="mt-8">
            <IncludedInFormule groups={included} />
          </div>
        )}

        {/* Estimation : prix par personne en grand, détail dépliable */}
        <div className="mt-10">
          <PriceSummary estimate={estimate} guestCount={couple.guestCount} formuleName={formule?.name} />
        </div>

        {/* Ce qui est toujours compris */}
        {inclusions.length > 0 && (
          <div className="mt-6">
            <InclusionsPanel inclusions={inclusions} />
          </div>
        )}

        {/* Pour vous recontacter */}
        <section className="mt-10 rounded-card border border-line bg-surface p-6">
          <h2 className="font-display text-2xl text-ink">Pour vous recontacter</h2>
          <p className="mt-1 text-sm text-muted">
            Votre traiteur vous rappellera pour affiner votre menu avec vous.
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <FormField label="Téléphone" required error={fieldErrors.phone}>
              {(a11y) => (
                <input
                  {...a11y}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={contact.phone}
                  data-field="phone"
                  onChange={(e) => update('phone', e.target.value)}
                  onBlur={tidyPhone}
                  placeholder="06 12 34 56 78"
                  className="input"
                />
              )}
            </FormField>
            <FormField
              label="Lieu de réception"
              required
              hint="Nom du domaine ou commune"
              error={fieldErrors.venue}
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="text"
                  autoComplete="off"
                  value={contact.venue}
                  maxLength={MAX_VENUE_LENGTH}
                  data-field="venue"
                  onChange={(e) => update('venue', e.target.value)}
                  placeholder="Domaine des Tilleuls, Saint-Cyr"
                  className="input"
                />
              )}
            </FormField>
            <FormField label="Allergies et régimes" optional error={fieldErrors.dietaryNotes}>
              {(a11y) => (
                <textarea
                  {...a11y}
                  rows={3}
                  value={contact.dietaryNotes}
                  maxLength={MAX_DIETARY_LENGTH}
                  data-field="dietaryNotes"
                  onChange={(e) => update('dietaryNotes', e.target.value)}
                  placeholder="3 végétariens, 1 sans gluten, 2 enfants"
                  className="input resize-y"
                />
              )}
            </FormField>
            <FormField label="Message" optional error={fieldErrors.message}>
              {(a11y) => (
                <textarea
                  {...a11y}
                  rows={3}
                  value={contact.message}
                  maxLength={MAX_MESSAGE_LENGTH}
                  data-field="message"
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Une question, une envie particulière…"
                  className="input resize-y"
                />
              )}
            </FormField>
          </div>
        </section>

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
              className="rounded-card border border-error/40 bg-surface p-4 text-left text-sm text-ink"
            >
              <p className="font-medium text-error">Votre menu n'a pas pu être envoyé :</p>
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
          <p className="text-center text-xs text-muted">
            En envoyant votre menu, vous acceptez que J&amp;J Traiteur utilise ces informations pour
            vous recontacter au sujet de votre mariage.
            {PRIVACY_URL && (
              <>
                {' '}
                <a
                  href={PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  Politique de confidentialité
                </a>
              </>
            )}
          </p>
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

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buildScreens } from '@core/journey'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { computeEstimate } from '../lib/pricing'
import { formatPrice } from '../lib/format'
import OptionToggle from '../components/OptionToggle'
import SaveIndicator from '../components/SaveIndicator'
import { ListSkeleton } from '../components/Skeletons'

// Libellés des catégories d'options (table figée : passage en données prévu,
// cf. docs/BACKLOG.md).
const CATEGORY_LABELS: Record<string, string> = {
  'bar-de-nuit': 'Bar de nuit',
  'en-cas': 'En-cas de fin de soirée',
  dessert: 'Autour du dessert',
  boissons: 'Boissons',
  services: 'Services',
  brunch: 'Brunch du lendemain',
}

export default function OptionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromRecap = (location.state as { fromRecap?: boolean } | null)?.fromRecap === true
  const { couple, formuleId, selections, optionIds, toggleOption, setCurrentStep } = useComposition()
  const { formules, steps, items, options, loading, error } = useCatalog()

  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
    else if (!formuleId) navigate('/formule', { replace: true })
  }, [couple, formuleId, navigate])

  // Dernière étape atteinte (pour la reprise et la relance).
  useEffect(() => {
    setCurrentStep('options')
  }, [setCurrentStep])

  if (!couple || !formuleId) return null
  if (loading) return <ListSkeleton />
  if (error) return <Centered text={`Erreur : ${error}`} />

  // Options finales : celles qui ne sont rattachées à aucune étape (une option
  // dont la catégorie porte le nom d'une étape s'affiche dans cette étape).
  const stepSlugs = new Set(steps.map((s) => s.slug))
  const finalOptions = options.filter((o) => !stepSlugs.has(o.category))
  const categories: string[] = []
  for (const o of finalOptions) if (!categories.includes(o.category)) categories.push(o.category)
  // Prix par personne en direct, toutes options comprises.
  const formule = formules.find((f) => f.id === formuleId) ?? null
  const estimate = computeEstimate(formule, items, selections, options, optionIds, couple.guestCount)
  // « Retour » : la DERNIÈRE étape de composition.
  const screens = buildScreens(formule, steps)
  const lastScreen = screens[screens.length - 1]

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-6 pt-10">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Dernière étape</p>
        <h1 className="mt-2 text-3xl leading-tight text-ink">Les options</h1>
        <p className="mt-2 text-muted">
          Quelques touches en plus pour prolonger la fête — entièrement facultatives.
        </p>

        {categories.map((cat) => (
          <section key={cat} className="mt-8">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {finalOptions
                .filter((o) => o.category === cat)
                .map((o) => (
                  <OptionToggle
                    key={o.id}
                    option={o}
                    selected={optionIds.includes(o.id)}
                    onToggle={() => toggleOption(o.id)}
                  />
                ))}
            </div>
          </section>
        ))}
      </main>

      {/* Barre d'action */}
      <div className="sticky bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => navigate(lastScreen ? `/composer/${lastScreen.slug}` : '/formule')}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink"
          >
            Retour
          </button>
          <div className="mr-auto text-left">
            <p className="text-sm font-medium text-ink">≈ {formatPrice(estimate.perPersonAllIn)} / pers.</p>
            <SaveIndicator />
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/recap')}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-accent-dark"
          >
            {fromRecap ? 'Revenir au récapitulatif' : 'Voir notre menu'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

function Centered({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-muted">
      {text}
    </div>
  )
}

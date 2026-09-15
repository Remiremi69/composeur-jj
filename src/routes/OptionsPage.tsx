import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { STEP_EMBEDDED_CATEGORIES } from '../lib/optionsConfig'
import OptionToggle from '../components/OptionToggle'

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
  const { couple, formuleId, optionIds, toggleOption } = useComposition()
  const { options, loading, error } = useCatalog()

  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
    else if (!formuleId) navigate('/formule', { replace: true })
  }, [couple, formuleId, navigate])

  if (!couple || !formuleId) return null
  if (loading) return <Centered text="Chargement des options…" />
  if (error) return <Centered text={`Erreur : ${error}`} />

  // Options finales : on exclut celles affichées dans une étape (ex : fromage).
  const finalOptions = options.filter((o) => !STEP_EMBEDDED_CATEGORIES.includes(o.category))
  const categories: string[] = []
  for (const o of finalOptions) if (!categories.includes(o.category)) categories.push(o.category)

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
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => navigate('/composer')}
            className="mr-auto rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink"
          >
            Retour
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/recap')}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-accent-dark"
          >
            Voir notre menu
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

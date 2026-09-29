import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { freeSteps } from '@core/journey'
import { formatPrice } from '../lib/format'
import { itemsForStep } from '../lib/rules'
import IncludedInFormule from '../components/IncludedInFormule'
import InclusionsPanel from '../components/InclusionsPanel'
import { FormulesSkeleton } from '../components/Skeletons'
import { track } from '../lib/tracking'

export default function FormulePage() {
  const navigate = useNavigate()
  const { couple, formuleId, setFormule, setCurrentStep } = useComposition()
  const { formules, steps, items, inclusions, popularFormuleId, loading, error } = useCatalog()

  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
  }, [couple, navigate])

  // Dernière étape atteinte (pour la reprise et la relance).
  useEffect(() => {
    setCurrentStep('formule')
  }, [setCurrentStep])

  if (!couple) return null
  if (loading) return <FormulesSkeleton />
  if (error) return <Centered text={`Erreur : ${error}`} />

  function choose(id: string) {
    setFormule(id)
    track('Formule choisie', { formule: formules.find((f) => f.id === id)?.slug ?? 'inconnue' })
    navigate('/composer')
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-slate">Étape 1</p>
        <h1 className="mt-2 text-3xl leading-tight text-slate sm:text-4xl">
          Choisissez votre formule
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Trois formules, trois ambiances — à vous de choisir votre rythme de fête.
          Vous composerez ensuite chaque plat à votre goût.
        </p>
      </div>

      {/* Les 3 formules côte à côte, contenu listé en dessous */}
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {formules.map((f, i) => {
          const selected = f.id === formuleId
          const popular = f.id === popularFormuleId
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              style={{ boxShadow: selected ? 'var(--shadow-card-hover)' : 'var(--shadow-card)' }}
              className={`relative flex flex-col rounded-card border bg-fond p-6 transition-colors ${
                selected ? 'border-slate' : 'border-lin'
              }`}
            >
              {/* Formule la plus choisie (au moins 10 menus envoyés) */}
              {popular && (
                <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-card bg-bronze px-3 py-1 text-xs font-bold text-ink">
                  La plus choisie
                </p>
              )}

              {/* En-tête : nom (le prix est en bas, façon carte de restaurant) */}
              <div className="text-center">
                <h2 className="font-display text-3xl text-slate">{f.name}</h2>
                {f.audience && <p className="mt-1 text-sm italic text-ink">{f.audience}</p>}
                {f.subtitle && <p className="mt-1 text-sm text-muted">{f.subtitle}</p>}
              </div>

              <div className="my-5 h-px bg-bronze/60" />

              {/* Le menu, présenté par sections (façon carte de restaurant) */}
              <FormuleMenu lines={f.highlights} />

              {/* Étapes sans choix : déjà comprises dans cette formule */}
              <div className="mt-5">
                <IncludedInFormule
                  collapsible
                  groups={freeSteps(f, steps)
                    .map((step) => ({
                      title: step.title,
                      items: itemsForStep(step, items).map((it) => ({
                        name: it.name,
                        description: it.description,
                      })),
                    }))
                    .filter((g) => g.items.length > 0)}
                />
              </div>

              {/* Inclus dans toutes les formules */}
              <p className="mt-5 border-t border-lin pt-4 text-center text-xs text-muted">
                Eaux · service · nappage · verre, couvert &amp; assiette inclus
              </p>

              {/* Prix — discret, en bas à droite (façon addition de restaurant) */}
              <p className="mt-5 flex items-baseline justify-end gap-1.5">
                <span className="font-display text-2xl text-ink">
                  {formatPrice(f.price_per_person)}
                </span>
                <span className="text-xs uppercase tracking-[0.12em] text-muted">/ personne</span>
              </p>

              {/* Choix */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => choose(f.id)}
                  className={`w-full rounded-card px-6 py-3 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-slate-deep text-lin'
                      : 'bg-slate text-lin hover:bg-slate-deep'
                  }`}
                >
                  {selected ? 'Continuer' : 'Choisir cette formule'}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {inclusions.length > 0 && (
        <div className="mt-12">
          <InclusionsPanel inclusions={inclusions} />
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Retour
        </button>
      </div>
    </div>
  )
}

// Rend les highlights d'une formule comme un menu :
//   '—'       => grand trait entre sections
//   '· texte' => sous-ligne (ex : "8 pièces au choix")
//   autre     => plat, avec un petit trait entre plats d'une même section
function FormuleMenu({ lines }: { lines: string[] }) {
  const sections: string[][] = []
  let cur: string[] = []
  for (const l of lines) {
    if (l === '—') {
      if (cur.length) sections.push(cur)
      cur = []
    } else {
      cur.push(l)
    }
  }
  if (cur.length) sections.push(cur)

  return (
    <div className="flex flex-1 flex-col">
      {sections.map((sec, si) => (
        <div key={si}>
          {si > 0 && <div className="my-3 h-px w-full bg-lin" />}
          {sec.map((line, li) => {
            if (line.startsWith('· ')) {
              return (
                <p key={li} className="text-center text-xs text-muted">
                  {line.slice(2)}
                </p>
              )
            }
            const prevIsCourse = li > 0 && !sec[li - 1].startsWith('· ')
            return (
              <div key={li}>
                {prevIsCourse && <div className="mx-auto my-2 h-px w-6 bg-lin" />}
                <p className="text-center text-sm text-ink">{line}</p>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Centered({ text }: { text: string }) {
  return (
    <div className="flex w-full flex-1 items-center justify-center px-6 text-center text-muted">
      {text}
    </div>
  )
}

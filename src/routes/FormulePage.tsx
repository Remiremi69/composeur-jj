import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { formatPrice } from '../lib/format'
import InclusionsPanel from '../components/InclusionsPanel'

export default function FormulePage() {
  const navigate = useNavigate()
  const { couple, formuleId, setFormule, setCurrentStep } = useComposition()
  const { formules, inclusions, loading, error } = useCatalog()

  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
  }, [couple, navigate])

  // Dernière étape atteinte (pour la reprise et la relance).
  useEffect(() => {
    setCurrentStep('formule')
  }, [setCurrentStep])

  if (!couple) return null
  if (loading) return <Centered text="Chargement des formules…" />
  if (error) return <Centered text={`Erreur : ${error}`} />

  function choose(id: string) {
    setFormule(id)
    navigate('/composer')
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Étape 1</p>
        <h1 className="mt-2 text-3xl leading-tight text-ink sm:text-4xl">
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
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              style={{ boxShadow: selected ? 'var(--shadow-card-hover)' : 'var(--shadow-card)' }}
              className={`flex flex-col rounded-card border bg-surface p-6 transition-colors ${
                selected ? 'border-accent' : 'border-line'
              }`}
            >
              {/* En-tête : nom (le prix est en bas, façon carte de restaurant) */}
              <div className="text-center">
                <h2 className="font-display text-3xl text-ink">{f.name}</h2>
                {f.subtitle && <p className="mt-1 text-sm text-muted">{f.subtitle}</p>}
              </div>

              <div className="my-5 h-px bg-line" />

              {/* Le menu, présenté par sections (façon carte de restaurant) */}
              <FormuleMenu lines={f.highlights} />

              {/* Inclus dans toutes les formules */}
              <p className="mt-5 border-t border-line pt-4 text-center text-xs text-muted">
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
                  className={`w-full rounded-full px-6 py-3 text-sm font-semibold shadow-[0_10px_24px_-12px_rgba(140,106,63,0.65)] transition-colors ${
                    selected
                      ? 'bg-accent-dark text-cream'
                      : 'bg-accent text-cream hover:bg-accent-dark'
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
          {si > 0 && <div className="my-3 h-px w-full bg-line" />}
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
                {prevIsCourse && <div className="mx-auto my-2 h-px w-6 bg-line" />}
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
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-muted">
      {text}
    </div>
  )
}

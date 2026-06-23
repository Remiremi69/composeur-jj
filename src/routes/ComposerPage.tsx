import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { evaluateStep, itemsForStep } from '../lib/rules'
import { compositionTotal } from '../lib/pricing'
import DishCard from '../components/DishCard'
import Plateau from '../components/Plateau'

export default function ComposerPage() {
  const navigate = useNavigate()
  const { couple, selections, toggleItem, setQuantity, removeItem } = useComposition()
  const { steps, items, loading, error } = useCatalog()
  const [index, setIndex] = useState(0)

  // Pas d'infos couple => retour à l'accueil.
  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
  }, [couple, navigate])

  if (!couple) return null

  if (loading) {
    return <CenteredMessage text="Chargement du catalogue…" />
  }
  if (error) {
    return <CenteredMessage text={`Impossible de charger le catalogue : ${error}`} />
  }
  if (steps.length === 0) {
    return <CenteredMessage text="Aucune étape disponible." />
  }

  const safeIndex = Math.min(index, steps.length - 1)
  const step = steps[safeIndex]
  const stepItems = itemsForStep(step, items)
  const status = evaluateStep(step, stepItems, selections)
  const total = compositionTotal(items, selections, couple.guestCount)
  const isLastStep = safeIndex === steps.length - 1

  function goNext() {
    if (safeIndex < steps.length - 1) {
      setIndex(safeIndex + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/recap')
    }
  }

  function goBack() {
    if (safeIndex > 0) {
      setIndex(safeIndex - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  const atRangeMax = step.rule_type === 'pick_range' && !status.canAddMore

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-8">
        {/* Progression */}
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          Étape {safeIndex + 1} / {steps.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="mt-2 text-3xl leading-tight text-ink">{step.title}</h1>
            {step.subtitle && <p className="mt-1 text-muted">{step.subtitle}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stepItems.map((item) => {
                const selected = (selections[item.id] ?? 0) > 0
                return (
                  <DishCard
                    key={item.id}
                    item={item}
                    selected={selected}
                    disabled={atRangeMax}
                    onToggle={() => toggleItem(step, stepItems, item)}
                  />
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <Plateau
        step={step}
        stepItems={stepItems}
        selections={selections}
        status={status}
        total={total}
        isLastStep={isLastStep}
        onRemove={removeItem}
        onSetQuantity={setQuantity}
        onBack={goBack}
        onNext={goNext}
      />
    </div>
  )
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-muted">
      {text}
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { evaluateStep, itemsForStep, resolveStep } from '../lib/rules'
import { computeEstimate } from '../lib/pricing'
import DishCard from '../components/DishCard'
import CategoryAccordion from '../components/CategoryAccordion'
import IncludedList from '../components/IncludedList'
import OptionToggle from '../components/OptionToggle'
import Plateau from '../components/Plateau'
import { STEP_EMBEDDED_CATEGORIES } from '../lib/optionsConfig'
import type { Formule, Step } from '../types/db'

// Étapes de la formule, dans l'ordre du repas.
function stepsOf(formule: Formule | null, steps: Step[]): Step[] {
  return formule ? steps.filter((s) => formule.included_steps.includes(s.slug)) : steps
}

// Index de l'étape en cours. Depuis les options ou le récap, on revient à la
// dernière étape ; sinon (formule, étape inconnue) à la première.
function indexOf(activeSteps: Step[], currentStep: string | null): number {
  const idx = activeSteps.findIndex((s) => s.slug === currentStep)
  if (idx >= 0) return idx
  return currentStep === 'options' || currentStep === 'recap' ? activeSteps.length - 1 : 0
}

export default function ComposerPage() {
  const navigate = useNavigate()
  const {
    couple,
    formuleId,
    selections,
    toggleItem,
    setQuantity,
    removeItem,
    optionIds,
    toggleOption,
    currentStep,
    setCurrentStep,
  } = useComposition()
  const { formules, steps, items, options, loading, error } = useCatalog()

  // Garde-fous : il faut un couple ET une formule choisie.
  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
    else if (!formuleId) navigate('/formule', { replace: true })
  }, [couple, formuleId, navigate])

  // L'étape en cours (enregistrée dans le brouillon) doit être une étape de
  // la formule : sinon on la recale.
  useEffect(() => {
    if (loading || !formuleId) return
    const formule = formules.find((f) => f.id === formuleId) ?? null
    const active = stepsOf(formule, steps)
    if (active.length === 0) return
    const slug = active[indexOf(active, currentStep)].slug
    if (slug !== currentStep) setCurrentStep(slug)
  }, [loading, formuleId, formules, steps, currentStep, setCurrentStep])

  if (!couple || !formuleId) return null

  if (loading) return <CenteredMessage text="Chargement du catalogue…" />
  if (error) return <CenteredMessage text={`Impossible de charger le catalogue : ${error}`} />

  const formule = formules.find((f) => f.id === formuleId) ?? null
  // On ne garde que les étapes incluses dans la formule choisie.
  const activeSteps = stepsOf(formule, steps)

  if (activeSteps.length === 0) {
    return <CenteredMessage text="Aucune étape disponible pour cette formule." />
  }

  const safeIndex = indexOf(activeSteps, currentStep)
  // Étape courante, avec la règle propre à la formule choisie (nb de pièces…).
  const step = resolveStep(activeSteps[safeIndex], formule)
  const stepItems = itemsForStep(step, items)
  const status = evaluateStep(step, stepItems, selections)
  // Options rattachées à cette étape (ex : présentation du fromage).
  const stepOptions = options.filter(
    (o) => o.category === step.slug && STEP_EMBEDDED_CATEGORIES.includes(o.category),
  )
  const isLastStep = safeIndex === activeSteps.length - 1
  // Prix par personne en direct, toutes options comprises.
  const estimate = computeEstimate(formule, items, selections, options, optionIds, couple.guestCount)

  function goNext() {
    if (safeIndex < activeSteps.length - 1) {
      setCurrentStep(activeSteps[safeIndex + 1].slug)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/options')
    }
  }

  function goBack() {
    if (safeIndex > 0) {
      setCurrentStep(activeSteps[safeIndex - 1].slug)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/formule')
    }
  }

  const atRangeMax = step.rule_type === 'pick_range' && !status.canAddMore

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          Étape {safeIndex + 1} / {activeSteps.length}
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

            {step.rule_type === 'free' ? (
              <IncludedList items={stepItems} />
            ) : stepItems.some((i) => i.category) ? (
              <CategoryAccordion
                items={stepItems}
                selections={selections}
                disabled={atRangeMax}
                onToggle={(item) => toggleItem(step, stepItems, item)}
              />
            ) : (
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
            )}

            {stepOptions.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-medium text-ink">En supplément</h2>
                <div className="flex flex-col gap-3">
                  {stepOptions.map((o) => (
                    <OptionToggle
                      key={o.id}
                      option={o}
                      selected={optionIds.includes(o.id)}
                      onToggle={() => toggleOption(o.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Plateau
        step={step}
        stepItems={stepItems}
        selections={selections}
        status={status}
        perPerson={estimate.perPersonAllIn}
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

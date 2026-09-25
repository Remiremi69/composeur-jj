import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  buildScreens,
  entryScreenSlug,
  maxReachableIndex,
  resolveComposerRoute,
  screenStatus,
  type Screen,
} from '@core/journey'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'
import { evaluateStep, itemsForStep } from '../lib/rules'
import { computeEstimate } from '../lib/pricing'
import CategoryAccordion from '../components/CategoryAccordion'
import DishCard from '../components/DishCard'
import ItemDetailSheet from '../components/ItemDetailSheet'
import OptionToggle from '../components/OptionToggle'
import Plateau from '../components/Plateau'
import RuleCounter from '../components/RuleCounter'
import { ScreenSkeleton } from '../components/Skeletons'
import StepTrail from '../components/StepTrail'
import Toast, { useToast } from '../components/Toast'
import type { Item, Option, Selections, Step } from '../types/db'

// Retour depuis le récapitulatif (« Modifier ») : conservé d'écran en écran.
type NavState = { fromRecap?: boolean } | null

// Message quand le maximum d'une étape est atteint.
function maxMessage(step: Step): string {
  const max = step.rule_type === 'exact_count' ? step.rule_min : step.rule_max
  return `Vous avez atteint vos ${max} ${step.unit_label ?? 'choix'}. Retirez un choix pour en sélectionner un autre.`
}

// /composer sans étape : reprend à la dernière étape visitée (ou la première).
export function ComposerEntry() {
  const navigate = useNavigate()
  const { couple, formuleId, currentStep, selections } = useComposition()
  const { formules, steps, items, loading } = useCatalog()

  useEffect(() => {
    if (!couple) return void navigate('/', { replace: true })
    if (!formuleId) return void navigate('/formule', { replace: true })
    if (loading) return
    const formule = formules.find((f) => f.id === formuleId) ?? null
    const screens = buildScreens(formule, steps)
    if (screens.length === 0) return void navigate('/options', { replace: true })
    navigate(`/composer/${entryScreenSlug(screens, steps, currentStep, items, selections)}`, { replace: true })
  }, [couple, formuleId, loading, formules, steps, items, currentStep, selections, navigate])

  return <ScreenSkeleton />
}

export default function ComposerPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fromRecap = (location.state as NavState)?.fromRecap === true
  const {
    couple,
    formuleId,
    selections,
    toggleItem,
    setQuantity,
    removeItem,
    optionIds,
    toggleOption,
    setCurrentStep,
  } = useComposition()
  const { formules, steps, items, options, loading, error } = useCatalog()
  const toast = useToast()
  const [detailItem, setDetailItem] = useState<Item | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const previousSlug = useRef<string | undefined>(undefined)

  const formule = useMemo(() => formules.find((f) => f.id === formuleId) ?? null, [formules, formuleId])
  const screens = useMemo(() => buildScreens(formule, steps), [formule, steps])
  const decision =
    !loading && screens.length > 0 ? resolveComposerRoute(screens, slug, items, selections) : null

  // Garde-fous : il faut un couple ET une formule choisie.
  useEffect(() => {
    if (!couple) navigate('/', { replace: true })
    else if (!formuleId) navigate('/formule', { replace: true })
  }, [couple, formuleId, navigate])

  // Étape inconnue ou pas encore accessible : redirection (sans empiler
  // d'entrée dans l'historique).
  const redirectTo = decision?.kind === 'redirect' ? decision.slug : null
  useEffect(() => {
    if (redirectTo) navigate(`/composer/${redirectTo}`, { replace: true, state: location.state })
  }, [redirectTo, navigate, location.state])

  // Dernière étape visitée (reprise, relance).
  const currentSlug = decision?.kind === 'ok' ? screens[decision.index].slug : null
  useEffect(() => {
    if (currentSlug) setCurrentStep(currentSlug)
  }, [currentSlug, setCurrentStep])

  // Après un changement d'étape, le focus va sur le titre de l'étape.
  useEffect(() => {
    if (!currentSlug) return
    if (previousSlug.current && previousSlug.current !== currentSlug) titleRef.current?.focus()
    previousSlug.current = currentSlug
  }, [currentSlug])

  const screen: Screen | null = decision?.kind === 'ok' ? screens[decision.index] : null

  // Tap sur un plat : au maximum atteint, on explique au lieu de griser.
  const handleToggle = useCallback(
    (step: Step, stepItems: Item[], item: Item) => {
      const isSelected = (selections[item.id] ?? 0) > 0
      if (!isSelected) {
        const status = evaluateStep(step, stepItems, selections)
        const full =
          (step.rule_type === 'pick_range' && !status.canAddMore) ||
          (step.rule_type === 'exact_count' && status.current >= (step.rule_min ?? 0))
        if (full) return toast.show(maxMessage(step))
      }
      toggleItem(step, stepItems, item)
    },
    [selections, toggleItem, toast],
  )

  // Étape (de l'écran en cours) à laquelle appartient un plat.
  const stepOfItem = useCallback(
    (item: Item) => screen?.steps.find((s) => s.id === item.step_id) ?? null,
    [screen],
  )

  // exact_count : on plafonne à la cible, avec le même message.
  const handleSetQuantity = useCallback(
    (itemId: string, qty: number) => {
      const item = items.find((i) => i.id === itemId)
      const step = item ? stepOfItem(item) : null
      if (step?.rule_type === 'exact_count' && qty > (selections[itemId] ?? 0)) {
        const status = evaluateStep(step, itemsForStep(step, items), selections)
        if (status.current >= (step.rule_min ?? 0)) return toast.show(maxMessage(step))
      }
      setQuantity(itemId, qty)
    },
    [items, stepOfItem, selections, setQuantity, toast],
  )

  if (!couple || !formuleId) return null
  if (loading) return <ScreenSkeleton />
  if (error) return <CenteredMessage text={`Impossible de charger le catalogue : ${error}`} />
  if (screens.length === 0) return <CenteredMessage text="Aucune étape disponible pour cette formule." />
  if (!screen || decision?.kind !== 'ok') return <ScreenSkeleton />

  const index = decision.index
  const status = screenStatus(screen, items, selections)
  const validity = screens.map((s) => screenStatus(s, items, selections).valid)
  const maxReach = maxReachableIndex(screens, items, selections)
  const screenItems = screen.steps.flatMap((s) => itemsForStep(s, items))
  const isLastScreen = index === screens.length - 1
  const grouped = screen.steps.length > 1
  // Prix par personne en direct, toutes options comprises.
  const estimate = computeEstimate(formule, items, selections, options, optionIds, couple.guestCount)
  const navState = fromRecap ? { fromRecap: true } : undefined

  const goTo = (i: number) => navigate(`/composer/${screens[i].slug}`, { state: navState })
  const goNext = () => (isLastScreen ? navigate('/options', { state: navState }) : goTo(index + 1))
  const goBack = () => (index > 0 ? goTo(index - 1) : navigate('/formule'))

  const detailStep = detailItem ? stepOfItem(detailItem) : null

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-6">
        <StepTrail
          screens={screens}
          currentIndex={index}
          maxReachable={maxReach}
          validity={validity}
          onSelect={goTo}
        />

        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-accent">
          Étape {index + 1} / {screens.length}
        </p>
        <h1 ref={titleRef} tabIndex={-1} className="mt-2 text-3xl leading-tight text-ink">
          {screen.title}
        </h1>
        {screen.subtitle && <p className="mt-1 text-muted">{screen.subtitle}</p>}

        <AnimatePresence mode="wait">
          <motion.div
            key={screen.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {status.steps.map(({ step, status: stepStatus }) => (
              <StepSection
                key={step.id}
                step={step}
                grouped={grouped}
                stepStatus={stepStatus}
                items={itemsForStep(step, items)}
                options={options.filter((o) => o.category === step.slug)}
                selections={selections}
                optionIds={optionIds}
                onToggle={handleToggle}
                onInfo={setDetailItem}
                onToggleOption={toggleOption}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toast message={toast.message} onClose={toast.clear} />

      <Plateau
        statuses={status.steps}
        items={screenItems}
        selections={selections}
        valid={status.valid}
        perPerson={estimate.perPersonAllIn}
        isLastScreen={isLastScreen}
        showBackToRecap={fromRecap}
        onBackToRecap={() => navigate('/recap')}
        onRemove={removeItem}
        onSetQuantity={handleSetQuantity}
        onBack={goBack}
        onNext={goNext}
      />

      <ItemDetailSheet
        item={detailItem}
        selected={detailItem ? (selections[detailItem.id] ?? 0) > 0 : false}
        onToggle={() => {
          if (detailItem && detailStep) handleToggle(detailStep, itemsForStep(detailStep, items), detailItem)
        }}
        onClose={() => setDetailItem(null)}
      />
    </div>
  )
}

// Une étape de l'écran : un écran peut en regrouper plusieurs (sections),
// chacune avec sa propre règle et son compteur.
function StepSection({
  step,
  grouped,
  stepStatus,
  items,
  options,
  selections,
  optionIds,
  onToggle,
  onInfo,
  onToggleOption,
}: {
  step: Step
  grouped: boolean
  stepStatus: ReturnType<typeof evaluateStep>
  items: Item[]
  options: Option[]
  selections: Selections
  optionIds: string[]
  onToggle: (step: Step, stepItems: Item[], item: Item) => void
  onInfo: (item: Item) => void
  onToggleOption: (id: string) => void
}) {
  return (
    <section className={grouped ? 'mt-8 border-t border-line pt-6 first:border-0 first:pt-0' : ''}>
      {grouped && (
        <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl text-ink">{step.title}</h2>
            {step.subtitle && <p className="text-sm text-muted">{step.subtitle}</p>}
          </div>
          <div className="sm:w-48">
            <RuleCounter status={stepStatus} />
          </div>
        </div>
      )}

      {items.some((i) => i.category) ? (
        <CategoryAccordion
          items={items}
          selections={selections}
          onToggle={(item) => onToggle(step, items, item)}
          onInfo={onInfo}
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <DishCard
              key={item.id}
              item={item}
              selected={(selections[item.id] ?? 0) > 0}
              onToggle={() => onToggle(step, items, item)}
              onInfo={() => onInfo(item)}
            />
          ))}
        </div>
      )}

      {options.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-ink">En supplément</h3>
          <div className="flex flex-col gap-3">
            {options.map((o) => (
              <OptionToggle
                key={o.id}
                option={o}
                selected={optionIds.includes(o.id)}
                onToggle={() => onToggleOption(o.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-muted">
      {text}
    </div>
  )
}

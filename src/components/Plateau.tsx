import { AnimatePresence, motion } from 'framer-motion'
import type { Item, Selections, Step } from '../types/db'
import type { RuleStatus } from '../lib/rules'
import { formatTotal } from '../lib/format'
import RuleCounter from './RuleCounter'

interface PlateauProps {
  step: Step
  stepItems: Item[]
  selections: Selections
  status: RuleStatus
  total: number
  isLastStep: boolean
  onRemove: (itemId: string) => void
  onSetQuantity: (itemId: string, qty: number) => void
  onBack: () => void
  onNext: () => void
}

export default function Plateau({
  step,
  stepItems,
  selections,
  status,
  total,
  isLastStep,
  onRemove,
  onSetQuantity,
  onBack,
  onNext,
}: PlateauProps) {
  const selected = stepItems.filter((it) => (selections[it.id] ?? 0) > 0)
  const showStepper = step.rule_type === 'exact_count'

  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {/* Règle + estimation */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <RuleCounter status={status} />
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted">Estimation</p>
            <p className="font-display text-lg text-ink">{formatTotal(total)}</p>
          </div>
        </div>

        {/* Plateau : plats choisis pour cette étape */}
        {selected.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <AnimatePresence initial={false}>
              {selected.map((it) => {
                const qty = selections[it.id] ?? 0
                return (
                  <motion.div
                    key={it.id}
                    layout
                    initial={{ scale: 0.6, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-cream py-1 pl-3 pr-1"
                  >
                    <span className="max-w-[9rem] truncate text-sm text-ink">{it.name}</span>

                    {showStepper ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSetQuantity(it.id, qty - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-ink"
                          aria-label={`Retirer une part de ${it.name}`}
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-medium text-ink">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSetQuantity(it.id, qty + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-cream"
                          aria-label={`Ajouter une part de ${it.name}`}
                        >
                          +
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemove(it.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-muted"
                        aria-label={`Retirer ${it.name}`}
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!status.satisfied}
            className="flex-1 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-cream transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastStep ? 'Voir notre menu' : 'Étape suivante'}
          </button>
        </div>
      </div>
    </div>
  )
}

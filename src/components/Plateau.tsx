import { AnimatePresence, motion } from 'framer-motion'
import type { Item, Selections, Step } from '../types/db'
import type { RuleStatus } from '../lib/rules'
import { formatPrice } from '../lib/format'
import RuleCounter from './RuleCounter'
import SaveIndicator from './SaveIndicator'

interface PlateauProps {
  statuses: { step: Step; status: RuleStatus }[] // une entrée par section de l'écran
  items: Item[] // plats de l'écran (toutes sections)
  selections: Selections
  valid: boolean // toutes les sections sont validées
  perPerson: number // prix par personne en direct, toutes options comprises
  isLastScreen: boolean
  showBackToRecap: boolean // arrivé depuis « Modifier » du récapitulatif
  onBackToRecap: () => void
  onRemove: (itemId: string) => void
  onSetQuantity: (itemId: string, qty: number) => void
  onBack: () => void
  onNext: () => void
}

export default function Plateau({
  statuses,
  items,
  selections,
  valid,
  perPerson,
  isLastScreen,
  showBackToRecap,
  onBackToRecap,
  onRemove,
  onSetQuantity,
  onBack,
  onNext,
}: PlateauProps) {
  const selected = items.filter((it) => (selections[it.id] ?? 0) > 0)
  const ruleOf = (it: Item) => statuses.find((s) => s.step.id === it.step_id)?.step.rule_type
  const doneCount = statuses.filter((s) => s.status.satisfied).length

  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {/* État de l'écran + prix par personne en direct + sauvegarde */}
        <div className="flex items-end gap-4">
          <div className="flex-1" aria-live="polite">
            {valid ? (
              <p className="flex items-center gap-2 text-base font-semibold text-accent">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-sm text-cream"
                >
                  ✓
                </span>
                C'est parfait
              </p>
            ) : statuses.length === 1 ? (
              <RuleCounter status={statuses[0].status} />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink">
                  {doneCount} / {statuses.length} choix faits
                </span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={false}
                    animate={{ width: `${(doneCount / statuses.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-ink">≈ {formatPrice(perPerson)} / pers.</p>
            <SaveIndicator />
          </div>
        </div>

        {/* Plats choisis sur cet écran (ligne défilable) */}
        {selected.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <AnimatePresence initial={false}>
              {selected.map((it) => {
                const qty = selections[it.id] ?? 0
                const stepper = ruleOf(it) === 'exact_count'
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
                    {stepper ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSetQuantity(it.id, qty - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-ink"
                          aria-label={`Retirer une part de ${it.name}`}
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-medium text-ink">{qty}</span>
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
          {showBackToRecap && (
            <button
              type="button"
              onClick={onBackToRecap}
              disabled={!valid}
              className="rounded-full border border-accent px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revenir au récapitulatif
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!valid}
            className="flex-1 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-cream transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastScreen ? 'Continuer' : 'Étape suivante'}
          </button>
        </div>
      </div>
    </div>
  )
}

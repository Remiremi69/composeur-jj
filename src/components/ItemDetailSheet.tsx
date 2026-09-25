import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Item } from '../types/db'
import { dietaryLabel, formatPrice } from '../lib/format'
import AllergenBadges from './AllergenBadges'
import DishPlaceholder from './DishPlaceholder'

// Fiche détail d'un plat : tiroir en bas d'écran sur mobile, fenêtre centrée
// sur ordinateur. Échap ou le fond ferment la fiche ; le focus revient
// ensuite à l'élément qui l'avait ouverte.
export default function ItemDetailSheet({
  item,
  selected,
  onToggle,
  onClose,
}: {
  item: Item | null
  selected: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!item) return
    openerRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      openerRef.current?.focus?.()
    }
  }, [item, onClose])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="fond"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-card bg-surface sm:max-w-lg sm:rounded-card"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={item.name}
                  width={800}
                  height={600}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <DishPlaceholder />
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fermer la fiche"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-lg text-ink shadow-[var(--shadow-sm)]"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-4 p-6">
              <div>
                <h2 id={titleId} className="font-display text-2xl text-ink">
                  {item.name}
                </h2>
                {item.supplement > 0 && (
                  <p className="mt-1 text-sm font-medium text-accent">
                    Supplément : + {formatPrice(item.supplement)} / pers
                  </p>
                )}
              </div>

              {item.description && <p className="text-ink">{item.description}</p>}

              {item.labels.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">Régimes</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.labels.map((code) => (
                      <span key={code} className="rounded-full bg-cream px-2 py-0.5 text-xs text-accent">
                        {dietaryLabel(code)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted">Allergènes</p>
                <div className="mt-1.5">
                  {item.allergens && item.allergens.length > 0 ? (
                    <AllergenBadges allergens={item.allergens} />
                  ) : (
                    <p className="text-sm text-muted">Liste des allergènes communiquée sur simple demande.</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onToggle()
                  onClose()
                }}
                className={`mt-2 rounded-full px-6 py-3 font-semibold transition-colors ${
                  selected
                    ? 'border border-line text-ink hover:border-accent'
                    : 'bg-accent text-cream hover:bg-accent-dark'
                }`}
              >
                {selected ? 'Retirer' : 'Choisir'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

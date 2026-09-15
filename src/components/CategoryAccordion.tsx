import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Item, Selections } from '../types/db'
import DishCard from './DishCard'

interface CategoryAccordionProps {
  items: Item[]
  selections: Selections
  disabled: boolean
  onToggle: (item: Item) => void
}

// Regroupe les plats par catégorie, dans l'ordre d'apparition.
function groupByCategory(items: Item[]): { category: string; items: Item[] }[] {
  const order: string[] = []
  const map = new Map<string, Item[]>()
  for (const it of items) {
    const cat = it.category ?? 'Autres'
    if (!map.has(cat)) {
      map.set(cat, [])
      order.push(cat)
    }
    map.get(cat)!.push(it)
  }
  return order.map((category) => ({ category, items: map.get(category)! }))
}

// Affiche les plats par type, chaque type étant un volet dépliable :
// on clique sur « Verrines » pour voir les verrines, etc.
export default function CategoryAccordion({
  items,
  selections,
  disabled,
  onToggle,
}: CategoryAccordionProps) {
  const groups = groupByCategory(items)
  // Tout fermé au départ : on clique un type pour dérouler ses pièces.
  const [open, setOpen] = useState<string[]>([])

  const toggleOpen = (cat: string) =>
    setOpen((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))

  return (
    <div className="mt-6 flex flex-col gap-3">
      {groups.map(({ category, items: catItems }) => {
        const isOpen = open.includes(category)
        const selectedCount = catItems.filter((i) => (selections[i.id] ?? 0) > 0).length
        return (
          <div key={category} className="overflow-hidden rounded-card border border-line">
            <button
              type="button"
              onClick={() => toggleOpen(category)}
              className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3.5 text-left"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-display text-lg text-ink">{category}</span>
                <span className="text-sm text-muted">({catItems.length})</span>
              </span>
              <span className="flex items-center gap-3">
                {selectedCount > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-cream">
                    {selectedCount}
                  </span>
                )}
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M6 9l6 6 6-6" />
                </motion.svg>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
                    {catItems.map((item) => (
                      <DishCard
                        key={item.id}
                        item={item}
                        selected={(selections[item.id] ?? 0) > 0}
                        disabled={disabled}
                        onToggle={() => onToggle(item)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

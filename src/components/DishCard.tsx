import { motion } from 'framer-motion'
import type { Item } from '../types/db'
import { dietaryLabel, formatPrice } from '../lib/format'
import DishPlaceholder from './DishPlaceholder'

interface DishCardProps {
  item: Item
  selected: boolean
  disabled: boolean
  onToggle: () => void
}

export default function DishCard({ item, selected, disabled, onToggle }: DishCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      whileTap={{ scale: 0.97 }}
      whileHover={disabled && !selected ? undefined : { y: -3 }}
      animate={{
        boxShadow: selected
          ? '0 0 0 2px var(--color-accent), var(--shadow-card-hover)'
          : 'var(--shadow-card)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex flex-col overflow-hidden rounded-card bg-surface text-left transition-opacity ${
        disabled && !selected ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      {/* Visuel */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <DishPlaceholder />
        )}

        {item.supplement > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] text-cream">
            + {formatPrice(item.supplement)} / pers
          </span>
        )}

        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-cream"
          >
            ✓
          </motion.span>
        )}
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-display text-base leading-tight text-ink">{item.name}</h3>
        {item.description && (
          <p className="line-clamp-3 text-sm text-muted">{item.description}</p>
        )}

        {item.labels.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {item.labels.map((code) => (
              <span
                key={code}
                className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-accent"
              >
                {dietaryLabel(code)}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  )
}

import { motion } from 'framer-motion'
import type { Item } from '../types/db'
import { formatPrice, priceUnitLabel } from '../lib/format'
import AllergenBadges from './AllergenBadges'
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
      animate={{
        boxShadow: selected
          ? '0 0 0 2px var(--color-accent)'
          : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      className={`flex flex-col overflow-hidden rounded-card bg-surface text-left transition-opacity ${
        disabled && !selected ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      {/* Visuel */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <DishPlaceholder />
        )}

        {item.is_seasonal && (
          <span
            title={item.season_note ?? undefined}
            className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] text-cream"
          >
            De saison
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

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <AllergenBadges allergens={item.allergens} />
          <p className="text-sm font-medium text-ink">
            {formatPrice(item.price)}{' '}
            <span className="font-normal text-muted">{priceUnitLabel(item.price_unit)}</span>
          </p>
        </div>
      </div>
    </motion.button>
  )
}

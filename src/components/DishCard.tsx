import { motion } from 'framer-motion'
import type { Item } from '../types/db'
import { dietaryLabel, formatPrice } from '../lib/format'
import DishPlaceholder from './DishPlaceholder'

interface DishCardProps {
  item: Item
  selected: boolean
  onToggle: () => void
  onInfo: () => void // ouvre la fiche détail
}

// Carte d'un plat. Jamais grisée : si le maximum est atteint, c'est l'écran
// qui explique quoi faire (message). Le bouton « i » ouvre la fiche détail.
export default function DishCard({ item, selected, onToggle, onInfo }: DishCardProps) {
  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -3 }}
        animate={{
          boxShadow: selected
            ? '0 0 0 2px var(--color-accent), var(--shadow-card-hover)'
            : 'var(--shadow-card)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-card bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        {/* Visuel */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt=""
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
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
              aria-hidden="true"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-cream"
            >
              ✓
            </motion.span>
          )}
        </div>

        {/* Corps (espace à droite pour le bouton « i ») */}
        <div className="flex flex-1 flex-col gap-2 p-3 pr-10">
          <h3 className="font-display text-base leading-tight text-ink">{item.name}</h3>
          {item.description && <p className="line-clamp-3 text-sm text-muted">{item.description}</p>}

          {item.labels.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1 pt-1">
              {item.labels.map((code) => (
                <span key={code} className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-accent">
                  {dietaryLabel(code)}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.button>

      {/* Fiche détail (bouton frère : un bouton ne peut pas en contenir un autre) */}
      <button
        type="button"
        onClick={onInfo}
        aria-label={`Voir le détail : ${item.name}`}
        className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface font-display text-sm italic text-muted hover:border-accent hover:text-accent"
      >
        i
      </button>
    </div>
  )
}

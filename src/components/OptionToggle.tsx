import type { Option } from '../types/db'
import { formatPrice } from '../lib/format'

function priceLabel(o: Option): string {
  if (o.price <= 0) return 'Sur demande'
  return o.price_unit === 'par_personne'
    ? `${formatPrice(o.price)} / pers`
    : `${formatPrice(o.price)} forfait`
}

// Une option cochable (bar de nuit, présentation fromage, brunch…).
export default function OptionToggle({
  option,
  selected,
  onToggle,
}: {
  option: Option
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-card border bg-surface p-4 text-left transition-colors ${
        selected ? 'border-accent' : 'border-line'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
          selected ? 'border-accent bg-accent text-cream' : 'border-line text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg text-ink">{option.name}</span>
          <span className="shrink-0 text-sm font-medium text-accent">{priceLabel(option)}</span>
        </span>
        {option.description && (
          <span className="mt-1 block text-sm text-muted">{option.description}</span>
        )}
      </span>
    </button>
  )
}

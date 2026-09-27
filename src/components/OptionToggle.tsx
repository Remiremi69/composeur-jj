import type { Option } from '../types/db'
import { optionPriceLabel } from '../lib/format'

// Prix vide = « Sur demande », 0 € = « Offert » (règle du noyau partagé).
const priceLabel = (o: Option) => optionPriceLabel(o)

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
      className={`flex w-full items-start gap-3 rounded-card border bg-fond p-4 text-left transition-colors ${
        selected ? 'border-slate' : 'border-lin'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-xs ${
          selected ? 'border-slate bg-slate text-lin' : 'border-lin text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg text-ink">{option.name}</span>
          <span className="shrink-0 text-sm font-medium text-slate">{priceLabel(option)}</span>
        </span>
        {option.description && (
          <span className="mt-1 block text-sm text-muted">{option.description}</span>
        )}
      </span>
    </button>
  )
}

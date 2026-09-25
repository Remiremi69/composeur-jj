import { useState } from 'react'
import type { Estimate } from '@core/pricing'
import { formatPrice } from '../lib/format'

// Estimation : prix par personne (toutes options comprises) en grand,
// détail dépliable (formule, suppléments, options) et total pour N convives.
// Même hiérarchie que dans les emails et le PDF.
export default function PriceSummary({
  estimate,
  guestCount,
  formuleName,
}: {
  estimate: Estimate
  guestCount: number
  formuleName?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-card border border-line bg-surface p-6 text-center">
      <p className="text-sm text-muted">Estimation</p>
      <p className="mt-1 font-display text-3xl text-ink">
        {formatPrice(estimate.perPersonAllIn)}
        <span className="ml-1 text-base font-normal text-muted">par personne</span>
      </p>
      <p className="text-xs text-muted">toutes options comprises</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 text-sm font-medium text-accent hover:text-accent-dark"
      >
        {open ? 'Masquer le détail ▴' : 'Voir le détail ▾'}
      </button>

      {open && (
        <dl className="mx-auto mt-3 flex max-w-sm flex-col gap-1.5 text-left text-sm">
          <Line
            label={formuleName ? `Formule ${formuleName}` : 'Formule'}
            value={`${formatPrice(estimate.basePerPerson)} / pers`}
          />
          {estimate.supplementsPerPerson > 0 && (
            <Line label="Suppléments des plats" value={`+ ${formatPrice(estimate.supplementsPerPerson)} / pers`} />
          )}
          {estimate.optionsPerPerson > 0 && (
            <Line label="Options par personne" value={`+ ${formatPrice(estimate.optionsPerPerson)} / pers`} />
          )}
          <div className="my-1 h-px bg-line" />
          <Line
            label={`Total pour ${guestCount} convives`}
            value={formatPrice(estimate.total)}
            strong
          />
          {estimate.forfaitOptions > 0 && (
            <Line label="dont options au forfait" value={formatPrice(estimate.forfaitOptions)} />
          )}
        </dl>
      )}

      <p className="mt-3 text-xs text-muted">
        Estimation indicative — votre traiteur J&amp;J vous confirmera le devis définitif.
      </p>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? 'font-medium text-ink' : 'text-ink'}>{value}</dd>
    </div>
  )
}

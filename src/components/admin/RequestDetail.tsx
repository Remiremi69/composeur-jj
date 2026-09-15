import type { ReactNode } from 'react'
import type {
  Composition,
  CompositionItem,
  CompositionOption,
  Formule,
  Item,
  Option,
  Step,
} from '../../types/db'
import { formatDate, formatTotal } from '../../lib/format'

interface RequestDetailProps {
  composition: Composition
  compItems: CompositionItem[]
  compOptions: CompositionOption[]
  steps: Step[]
  items: Item[]
  options: Option[]
  formules: Formule[]
  onBack: () => void
  onToggleHandled: (c: Composition) => void
}

export default function RequestDetail({
  composition,
  compItems,
  compOptions,
  steps,
  items,
  options,
  formules,
  onBack,
  onToggleHandled,
}: RequestDetailProps) {
  const c = composition
  const formule = formules.find((f) => f.id === c.formule_id)

  const chosenItemIds = new Set(
    compItems.filter((ci) => ci.composition_id === c.id).map((ci) => ci.item_id),
  )
  const chosenOptionIds = new Set(
    compOptions.filter((co) => co.composition_id === c.id).map((co) => co.option_id),
  )
  const chosenOptions = options.filter((o) => chosenOptionIds.has(o.id))

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm font-medium text-muted hover:text-ink"
      >
        ← Retour aux demandes
      </button>

      {/* Fiche */}
      <div className="rounded-card border border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-ink">{c.couple_names}</h1>
            <p className="mt-1 text-sm text-muted">
              {c.wedding_date ? formatDate(c.wedding_date) : '—'} · {c.guest_count} convives
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleHandled(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              c.handled
                ? 'border border-line text-muted hover:text-ink'
                : 'bg-accent text-cream hover:bg-accent-dark'
            }`}
          >
            {c.handled ? 'Marquer non traité' : 'Marquer traité'}
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Email" value={<a href={`mailto:${c.email}`} className="text-accent">{c.email}</a>} />
          <Row label="Formule" value={formule?.name ?? '—'} />
          <Row
            label="Estimation"
            value={c.total_estimate != null ? formatTotal(c.total_estimate) : '—'}
          />
        </dl>
      </div>

      {/* Menu */}
      <div className="mt-6 rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-lg text-ink">Le menu choisi</h2>
        <div className="mt-4 flex flex-col gap-5">
          {steps.map((step) => {
            const stepItems = items
              .filter((it) => it.step_id === step.id && chosenItemIds.has(it.id))
              .sort((a, b) => a.position - b.position)
            if (stepItems.length === 0) return null
            return (
              <section key={step.id}>
                <h3 className="text-xs uppercase tracking-[0.15em] text-muted">{step.title}</h3>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {stepItems.map((it) => (
                    <li key={it.id} className="text-ink">
                      {it.name}
                      {it.supplement > 0 && (
                        <span className="text-muted"> · + {formatTotal(it.supplement)}/pers</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          {chosenOptions.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-muted">Options</h3>
              <ul className="mt-1.5 flex flex-col gap-1">
                {chosenOptions.map((o) => (
                  <li key={o.id} className="text-ink">
                    {o.name}
                    <span className="text-muted">
                      {' '}
                      ·{' '}
                      {o.price_unit === 'par_personne'
                        ? `${formatTotal(o.price)}/pers`
                        : `${formatTotal(o.price)} forfait`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label} :</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

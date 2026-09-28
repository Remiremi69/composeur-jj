import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Composition, CompositionItem, CompositionNote, Item } from '../../types/db'
import { formatPrice } from '../../lib/format'
import {
  averageFirstContactHours,
  basketComparison,
  conversionBySource,
  funnel,
  lostReasons,
  topDishes,
} from '../../lib/crm'

interface StatsPanelProps {
  compositions: Composition[]
  statusNotes: CompositionNote[]
  compItems: CompositionItem[]
  items: Item[]
}

const pct = (rate: number | null) => (rate == null ? '—' : `${Math.round(rate * 100)} %`)

function delayLabel(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} jours`
}

// Tableau de bord commercial. Les compositions de test sont exclues partout.
export default function StatsPanel({ compositions, statusNotes, compItems, items }: StatsPanelProps) {
  const [days, setDays] = useState<30 | 90>(30)
  const steps = funnel(compositions, statusNotes, days)
  const delay = averageFirstContactHours(compositions)
  const sources = conversionBySource(compositions)
  const basket = basketComparison(compositions)
  const losses = lostReasons(compositions)
  const dishes = topDishes(compositions, compItems, items, 10)
  const max = Math.max(1, steps[0]?.count ?? 1)

  return (
    <div className="flex flex-col gap-10">
      {/* Entonnoir */}
      <Section
        title="Entonnoir"
        action={
          <div role="group" aria-label="Période" className="flex gap-1">
            {([30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
                className={`rounded-card border px-3 py-1 text-sm ${
                  days === d ? 'border-slate bg-slate text-lin' : 'border-lin bg-fond text-ink hover:border-slate'
                }`}
              >
                {d} jours
              </button>
            ))}
          </div>
        }
      >
        <p className="mb-3 text-xs text-muted">
          Menus commencés sur les {days} derniers jours, et jusqu’où ils sont allés. Une demande compte à
          chaque étape qu’elle a atteinte, même si elle a été perdue ensuite. Le pourcentage indique la part
          de l’étape précédente.
        </p>
        <div className="flex flex-col gap-2">
          {steps.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-ink">{s.label}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-card bg-lin-light">
                <div
                  className="flex h-full items-center justify-end bg-slate px-2 text-xs font-bold text-lin"
                  style={{ width: `${Math.max((s.count / max) * 100, s.count ? 6 : 0)}%` }}
                >
                  {s.count > 0 ? s.count : ''}
                </div>
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-bold text-slate">
                {s.rate == null ? '' : pct(s.rate)}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Chiffres clés */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Délai de premier contact"
          value={delay ? delayLabel(delay.hours) : '—'}
          sub={delay ? `en moyenne, sur ${delay.count} demande${delay.count > 1 ? 's' : ''}` : 'aucun contact daté'}
        />
        <StatCard
          label="Panier des menus signés"
          value={basket.signed != null ? `${formatPrice(Math.round(basket.signed))}` : '—'}
          sub="par personne, tout compris"
        />
        <StatCard
          label="Panier de tous les menus envoyés"
          value={basket.all != null ? `${formatPrice(Math.round(basket.all))}` : '—'}
          sub="par personne, tout compris"
        />
      </div>

      {/* Conversion par source */}
      <Section title="Conversion par source">
        {sources.length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-lin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-lin bg-lin-light text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 text-right font-medium">Envoyés</th>
                  <th className="px-4 py-2 text-right font-medium">Signés</th>
                  <th className="px-4 py-2 text-right font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((r) => (
                  <tr key={r.source} className="border-b border-lin bg-fond last:border-0">
                    <td className="px-4 py-2 text-ink">{r.source}</td>
                    <td className="px-4 py-2 text-right text-ink">{r.sent}</td>
                    <td className="px-4 py-2 text-right text-ink">{r.signed}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate">{pct(r.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Motifs de perte">
        <BarList data={losses.map((l) => ({ name: l.reason, count: l.count }))} suffix="" />
      </Section>

      <Section title="Plats les plus choisis">
        <BarList data={dishes} suffix="fois" />
      </Section>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-card border border-lin bg-fond p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-slate">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-slate">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function BarList({ data, suffix }: { data: { name: string; count: number }[]; suffix: string }) {
  if (data.length === 0) return <p className="text-sm text-muted">—</p>
  const total = Math.max(...data.map((d) => d.count))
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="w-1/2 truncate text-sm text-ink" title={d.name}>
            {d.name}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-lin-light">
            <div className="h-full rounded-full bg-slate" style={{ width: `${Math.max((d.count / total) * 100, 4)}%` }} />
          </div>
          <span className="w-16 text-right text-sm text-muted">
            {d.count} {suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

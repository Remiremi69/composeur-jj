import type { ReactNode } from 'react'
import type { Composition, CompositionItem, Formule, Item } from '../../types/db'
import { formatTotal } from '../../lib/format'
import {
  averageBasket,
  averageGuests,
  averagePerPerson,
  byFormule,
  requestsLast30Days,
  topDishes,
  type NamedCount,
} from '../../lib/analytics'

interface StatsPanelProps {
  compositions: Composition[]
  compItems: CompositionItem[]
  formules: Formule[]
  items: Item[]
}

export default function StatsPanel({
  compositions,
  compItems,
  formules,
  items,
}: StatsPanelProps) {
  const total = compositions.length
  const last30 = requestsLast30Days(compositions)
  const basket = averageBasket(compositions)
  const perPerson = averagePerPerson(compositions)
  const guests = averageGuests(compositions)
  const formuleStats = byFormule(compositions, formules)
  const dishes = topDishes(compItems, items, 10)

  if (total === 0) {
    return <p className="py-12 text-center text-muted">Aucune demande pour le moment.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Cartes chiffres clés */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Demandes reçues" value={String(total)} sub={`${last30} sur 30 jours`} />
        <StatCard label="Panier moyen" value={formatTotal(basket)} sub="par mariage" />
        <StatCard label="Par personne" value={formatTotal(perPerson)} sub="en moyenne" />
        <StatCard label="Convives" value={String(guests)} sub="en moyenne" />
      </div>

      {/* Répartition par formule */}
      <Section title="Répartition par formule">
        <BarList data={formuleStats} total={total} suffix="demandes" />
      </Section>

      {/* Top plats */}
      <Section title="Plats les plus choisis">
        <BarList data={dishes} total={dishes[0]?.count ?? 1} suffix="fois" />
      </Section>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-lg text-ink">{title}</h2>
      {children}
    </div>
  )
}

function BarList({ data, total, suffix }: { data: NamedCount[]; total: number; suffix: string }) {
  if (data.length === 0) return <p className="text-sm text-muted">—</p>
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const ratio = total > 0 ? d.count / total : 0
        return (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-1/2 truncate text-sm text-ink" title={d.name}>
              {d.name}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(ratio * 100, 4)}%` }}
              />
            </div>
            <span className="w-14 text-right text-sm text-muted">
              {d.count} {suffix}
            </span>
          </div>
        )
      })}
    </div>
  )
}

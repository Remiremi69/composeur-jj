import type { Composition, Formule } from '../../types/db'
import { formatDate, formatTotal } from '../../lib/format'

interface RequestsTableProps {
  compositions: Composition[]
  formules: Formule[]
  onSelect: (c: Composition) => void
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR')
}

export default function RequestsTable({ compositions, formules, onSelect }: RequestsTableProps) {
  const formuleName = (id: string | null) => formules.find((f) => f.id === id)?.name ?? '—'

  if (compositions.length === 0) {
    return <p className="py-12 text-center text-muted">Aucune demande pour le moment.</p>
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-cream text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Couple</th>
            <th className="px-4 py-3 font-medium">Date mariage</th>
            <th className="px-4 py-3 font-medium">Convives</th>
            <th className="px-4 py-3 font-medium">Formule</th>
            <th className="px-4 py-3 font-medium">Estimation</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Reçu le</th>
          </tr>
        </thead>
        <tbody>
          {compositions.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-cream/60"
            >
              <td className="px-4 py-3 font-medium text-ink">{c.couple_names}</td>
              <td className="px-4 py-3 text-muted">
                {c.wedding_date ? formatDate(c.wedding_date) : '—'}
              </td>
              <td className="px-4 py-3 text-muted">{c.guest_count ?? '—'}</td>
              <td className="px-4 py-3 text-muted">{formuleName(c.formule_id)}</td>
              <td className="px-4 py-3 text-ink">
                {c.total_estimate != null ? formatTotal(c.total_estimate) : '—'}
              </td>
              <td className="px-4 py-3">
                {c.handled ? (
                  <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-muted">Traité</span>
                ) : (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-cream">Nouveau</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">{shortDate(c.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

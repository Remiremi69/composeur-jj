import { useMemo } from 'react'
import type { Composition, Formule, Step } from '../../types/db'
import { formatDate, formatTotal } from '../../lib/format'
import {
  CRM_STATUS_LABELS,
  TAB_LABELS,
  inTab,
  lastStepLabel,
  matchesSearch,
  receivedAt,
  requestsCsv,
  sortRequests,
  type RequestTab,
  type SortKey,
} from '../../lib/crm'

interface RequestsTableProps {
  compositions: Composition[] // envoyées et brouillons, tests compris
  formules: Formule[]
  steps: Step[]
  onSelect: (c: Composition) => void
  onToggleTest: (c: Composition) => void
  view: ListView // onglet, recherche, tri : conservés en revenant d'une fiche
  onViewChange: (view: ListView) => void
}

export interface ListView {
  tab: RequestTab
  query: string
  sort: SortKey
  showTests: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_VIEW: ListView = { tab: 'nouveaux', query: '', sort: 'reception', showTests: false }

const TABS: RequestTab[] = ['nouveaux', 'en_cours', 'signes', 'perdus', 'brouillons']

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
}

function shortDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLE: Record<string, string> = {
  nouveau: 'bg-slate text-lin',
  contacte: 'bg-lin text-ink',
  degustation: 'bg-lin text-ink',
  devis_envoye: 'bg-lin text-ink',
  signe: 'bg-bronze text-ink',
  perdu: 'border border-lin text-muted',
}

export default function RequestsTable({
  compositions,
  formules,
  steps,
  onSelect,
  onToggleTest,
  view,
  onViewChange,
}: RequestsTableProps) {
  const { tab, query, sort, showTests } = view
  const setTab = (t: RequestTab) => onViewChange({ ...view, tab: t })
  const setQuery = (q: string) => onViewChange({ ...view, query: q })
  const setSort = (k: SortKey) => onViewChange({ ...view, sort: k })
  const setShowTests = (b: boolean) => onViewChange({ ...view, showTests: b })

  const formuleName = (id: string | null) => formules.find((f) => f.id === id)?.name ?? '—'
  const visible = (c: Composition) => showTests || !c.is_test

  const counts = useMemo(() => {
    const out = {} as Record<RequestTab, number>
    for (const t of TABS) out[t] = compositions.filter((c) => visible(c) && inTab(c, t)).length
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositions, showTests])

  const rows = useMemo(() => {
    const filtered = compositions.filter((c) => visible(c) && inTab(c, tab) && matchesSearch(c, query))
    return tab === 'brouillons'
      ? [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      : sortRequests(filtered, sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositions, tab, query, sort, showTests])

  function exportCsv() {
    const csv = requestsCsv(rows, formules, steps, tab)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `composeur-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Onglets */}
      <div role="tablist" aria-label="Demandes par statut" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-card border px-3 py-1.5 text-sm transition-colors ${
              tab === t ? 'border-slate bg-slate text-lin' : 'border-lin bg-fond text-ink hover:border-slate'
            }`}
          >
            {TAB_LABELS[t]} <span className={tab === t ? 'text-lin' : 'text-muted'}>({counts[t]})</span>
          </button>
        ))}
      </div>

      {/* Recherche, tri, tests, export */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-56 flex-1 items-center">
          <span className="sr-only">Rechercher par nom ou email</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom ou un email…"
            className="input py-2"
          />
        </label>
        {tab !== 'brouillons' && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Trier par
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-card border border-lin bg-fond px-2 py-2 text-ink"
            >
              <option value="reception">date de réception</option>
              <option value="mariage">date de mariage</option>
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showTests} onChange={(e) => setShowTests(e.target.checked)} />
          Afficher les tests
        </label>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="rounded-card border border-slate px-3 py-2 text-sm font-bold text-slate hover:bg-lin-light disabled:opacity-40"
        >
          Exporter (CSV)
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted">
          {query ? 'Aucun résultat pour cette recherche.' : 'Rien dans cet onglet pour le moment.'}
        </p>
      ) : tab === 'brouillons' ? (
        <div className="overflow-x-auto rounded-card border border-lin">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-lin bg-lin-light text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Prénoms</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Date mariage</th>
                <th className="px-4 py-3 font-medium">Convives</th>
                <th className="px-4 py-3 font-medium">Étape atteinte</th>
                <th className="px-4 py-3 font-medium">Dernière activité</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-lin bg-fond last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {c.couple_names || '—'}
                    {c.is_test && <TestBadge />}
                  </td>
                  <td className="px-4 py-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-slate underline-offset-2 hover:underline">
                        {c.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.wedding_date ? formatDate(c.wedding_date) : '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.guest_count ?? '—'}</td>
                  <td className="px-4 py-3 text-ink">{lastStepLabel(c.last_step, steps)}</td>
                  <td className="px-4 py-3 text-muted">{shortDateTime(c.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleTest(c)}
                      className="text-xs text-muted underline underline-offset-2 hover:text-ink"
                    >
                      {c.is_test ? 'Retirer des tests' : 'Marquer comme test'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-lin">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-lin bg-lin-light text-xs uppercase tracking-wide text-muted">
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
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="cursor-pointer border-b border-lin bg-fond last:border-0 hover:bg-lin-light/60"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(c)
                      }}
                      className="text-left hover:underline"
                    >
                      {c.couple_names}
                    </button>
                    {c.is_test && <TestBadge />}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.wedding_date ? formatDate(c.wedding_date) : '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.guest_count ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{formuleName(c.formule_id)}</td>
                  <td className="px-4 py-3 text-ink">
                    {c.total_estimate != null ? formatTotal(c.total_estimate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-card px-2 py-0.5 text-xs ${STATUS_STYLE[c.crm_status]}`}>
                      {CRM_STATUS_LABELS[c.crm_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{shortDate(receivedAt(c))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TestBadge() {
  return <span className="ml-2 rounded-card border border-lin px-1.5 py-0.5 text-[11px] font-normal text-muted">test</span>
}

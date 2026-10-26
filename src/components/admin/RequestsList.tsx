import { useMemo, useState } from 'react'
import type { Composition, CompositionNote, Formule, Step } from '../../types/db'
import { matchesSearch, requestsCsv, type RequestTab } from '../../lib/crm'
import { HOME_VIEW_LABELS, duplicateIds, homeCounters, inView, sortForView, type HomeView } from '../../lib/contacts'
import RequestCard from './RequestCard'
import SendConfigurator from './SendConfigurator'

export interface ListView {
  view: HomeView
  query: string
  showTests: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_VIEW: ListView = { view: 'a_rappeler', query: '', showTests: false }

const VIEWS: HomeView[] = ['a_rappeler', 'en_cours', 'signes', 'perdus', 'brouillons']
// Correspondance avec les onglets de l'export CSV (lib/crm).
const CSV_TAB: Record<HomeView, RequestTab> = {
  a_rappeler: 'nouveaux',
  en_cours: 'en_cours',
  signes: 'signes',
  perdus: 'perdus',
  brouillons: 'brouillons',
}

interface Props {
  compositions: Composition[]
  statusNotes: CompositionNote[]
  formules: Formule[]
  steps: Step[]
  view: ListView
  onViewChange: (v: ListView) => void
  onOpen: (id: string) => void
  onChanged: () => void
}

// Accueil de l'espace traiteur, pensé pour le téléphone : trois compteurs,
// puis des cartes. Vue par défaut : « À rappeler », les plus anciennes d'abord.
export default function RequestsList({ compositions, statusNotes, formules, steps, view, onViewChange, onOpen, onChanged }: Props) {
  const [sending, setSending] = useState<Composition | null>(null)
  const now = Date.now()
  const visible = (c: Composition) => view.showTests || !c.is_test

  const counters = useMemo(() => homeCounters(compositions, statusNotes), [compositions, statusNotes])
  const dupes = useMemo(() => duplicateIds(compositions), [compositions])
  const counts = useMemo(() => {
    const out = {} as Record<HomeView, number>
    for (const v of VIEWS) out[v] = compositions.filter((c) => visible(c) && inView(c, v)).length
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositions, view.showTests])
  const rows = useMemo(
    () => sortForView(compositions.filter((c) => visible(c) && inView(c, view.view) && matchesSearch(c, view.query)), view.view),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compositions, view],
  )

  function exportCsv() {
    const tab = CSV_TAB[view.view]
    const csv = requestsCsv(rows, formules, steps, tab)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `composeur-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const set = (patch: Partial<ListView>) => onViewChange({ ...view, ...patch })

  return (
    <div className="flex flex-col gap-5 text-base">
      {/* Trois gros compteurs */}
      <div className="grid grid-cols-3 gap-2">
        <Counter label="À rappeler" value={counters.aRappeler} active={view.view === 'a_rappeler'} onClick={() => set({ view: 'a_rappeler' })} />
        <Counter label="En cours" value={counters.enCours} active={view.view === 'en_cours'} onClick={() => set({ view: 'en_cours' })} />
        <Counter label="Signés ce mois-ci" value={counters.signesCeMois} active={view.view === 'signes'} onClick={() => set({ view: 'signes' })} />
      </div>

      {/* Autres vues */}
      <div role="tablist" aria-label="Demandes par statut" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view.view === v}
            onClick={() => set({ view: v })}
            className={`min-h-11 shrink-0 rounded-card border px-3 text-base transition-colors ${
              view.view === v ? 'border-slate bg-slate text-lin' : 'border-lin bg-fond text-ink'
            }`}
          >
            {HOME_VIEW_LABELS[v]} ({counts[v]})
          </button>
        ))}
      </div>

      <label className="flex">
        <span className="sr-only">Rechercher un prénom ou un email</span>
        <input type="search" value={view.query} onChange={(e) => set({ query: e.target.value })} placeholder="Rechercher un prénom ou un email…" className="input" />
      </label>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-muted">
          {view.query ? 'Aucun résultat pour cette recherche.' : view.view === 'a_rappeler' ? 'Personne à rappeler : tout est à jour.' : 'Rien ici pour le moment.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((c) => (
            <RequestCard
              key={c.id}
              composition={c}
              duplicate={dupes.has(c.id)}
              now={now}
              onOpen={() => onOpen(c.id)}
              onSend={() => setSending(c)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lin pt-4 text-muted">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="h-5 w-5" checked={view.showTests} onChange={(e) => set({ showTests: e.target.checked })} />
          Afficher les tests
        </label>
        <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="min-h-11 underline underline-offset-2 disabled:opacity-40">
          Exporter cette liste (tableur)
        </button>
      </div>

      {sending && <SendConfigurator composition={sending} onClose={() => setSending(null)} />}
    </div>
  )
}

function Counter({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-24 flex-col items-center justify-center rounded-card border p-2 text-center ${
        active ? 'border-slate bg-slate text-lin' : 'border-lin bg-fond text-slate'
      }`}
    >
      <span className="font-display text-4xl leading-none">{value}</span>
      <span className={`mt-1 text-base leading-tight ${active ? 'text-lin' : 'text-ink'}`}>{label}</span>
    </button>
  )
}

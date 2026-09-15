import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAdminData } from '../hooks/useAdminData'
import type { Composition } from '../types/db'
import AdminLogin from '../components/admin/AdminLogin'
import RequestsTable from '../components/admin/RequestsTable'
import RequestDetail from '../components/admin/RequestDetail'
import StatsPanel from '../components/admin/StatsPanel'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center text-muted">…</div>
  }
  if (!session) return <AdminLogin />
  return <AdminDashboard />
}

function AdminDashboard() {
  const data = useAdminData()
  const [tab, setTab] = useState<'demandes' | 'stats'>('demandes')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = selectedId
    ? data.compositions.find((c) => c.id === selectedId) ?? null
    : null

  async function toggleHandled(c: Composition) {
    await supabase.from('compositions').update({ handled: !c.handled }).eq('id', c.id)
    data.refresh()
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">J&amp;J Traiteur</p>
            <h1 className="font-display text-xl text-ink">Espace traiteur</h1>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Se déconnecter
          </button>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 px-5">
          <TabButton active={tab === 'demandes'} onClick={() => { setTab('demandes'); setSelectedId(null) }}>
            Demandes
          </TabButton>
          <TabButton active={tab === 'stats'} onClick={() => { setTab('stats'); setSelectedId(null) }}>
            Statistiques
          </TabButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {data.loading ? (
          <p className="py-12 text-center text-muted">Chargement…</p>
        ) : data.error ? (
          <p className="py-12 text-center text-accent">Erreur : {data.error}</p>
        ) : tab === 'stats' ? (
          <StatsPanel
            compositions={data.compositions}
            compItems={data.compItems}
            formules={data.formules}
            items={data.items}
          />
        ) : selected ? (
          <RequestDetail
            composition={selected}
            compItems={data.compItems}
            compOptions={data.compOptions}
            steps={data.steps}
            items={data.items}
            options={data.options}
            formules={data.formules}
            onBack={() => setSelectedId(null)}
            onToggleHandled={toggleHandled}
          />
        ) : (
          <RequestsTable
            compositions={data.compositions}
            formules={data.formules}
            onSelect={(c) => setSelectedId(c.id)}
          />
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

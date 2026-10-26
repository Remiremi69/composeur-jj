import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAdminData } from '../hooks/useAdminData'
import AdminLogin from '../components/admin/AdminLogin'
import RequestsList, { DEFAULT_VIEW, type ListView } from '../components/admin/RequestsList'
import RequestDetail from '../components/admin/RequestDetail'
import StatsPanel from '../components/admin/StatsPanel'
import AddContactSheet from '../components/admin/AddContactSheet'
import InstallBanner from '../components/admin/InstallBanner'
import LinksPage from '../components/admin/LinksPage'

// Balises propres au back-office, retirées en le quittant :
// • jamais indexé par les moteurs de recherche (en plus de robots.txt) ;
// • installable sur téléphone (« J&J Demandes ») : le manifeste n'est lié
//   QUE sur les pages /admin, le site public n'est pas une application.
function useAdminHead() {
  useEffect(() => {
    const added: HTMLElement[] = []
    const meta = (name: string, content: string) => {
      const el = document.createElement('meta')
      el.name = name
      el.content = content
      added.push(document.head.appendChild(el))
    }
    meta('robots', 'noindex, nofollow')
    meta('apple-mobile-web-app-capable', 'yes')
    meta('mobile-web-app-capable', 'yes')
    meta('apple-mobile-web-app-title', 'J&J Demandes')
    meta('apple-mobile-web-app-status-bar-style', 'default')
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/admin.webmanifest'
    added.push(document.head.appendChild(link))
    const title = document.title
    document.title = 'J&J Demandes'
    return () => {
      added.forEach((el) => el.remove())
      document.title = title
    }
  }, [])
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  useAdminHead()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Être connecté ne suffit pas : il faut être déclaré dans la table admins.
  // null = vérification en cours.
  const userId = session?.user.id ?? null
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  useEffect(() => {
    if (!userId) {
      setIsAdmin(null)
      return
    }
    let cancelled = false
    setIsAdmin(null)
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!cancelled) setIsAdmin(!error && data === true)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center text-muted">…</div>
  }
  if (!session) return <AdminLogin />
  if (isAdmin === null) {
    return <div className="flex min-h-screen items-center justify-center text-base text-muted">Vérification de vos accès…</div>
  }
  if (!isAdmin) return <AccessDenied email={session.user.email ?? null} />
  return <AdminDashboard />
}

function AccessDenied({ email }: { email: string | null }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center text-base">
      <p className="text-sm uppercase tracking-[0.2em] text-slate">J&amp;J Traiteur</p>
      <h1 className="mt-2 font-display text-3xl text-slate">Accès réservé</h1>
      <p className="mt-3 text-muted">
        Ce compte{email ? ` (${email})` : ''} n'a pas accès à l'espace traiteur.
      </p>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="mt-6 min-h-12 rounded-card bg-slate px-6 py-3 font-semibold text-lin transition-colors hover:bg-slate-deep"
      >
        Se déconnecter
      </button>
    </div>
  )
}

function AdminDashboard() {
  const data = useAdminData()
  const [listView, setListView] = useState<ListView>(DEFAULT_VIEW)
  const [adding, setAdding] = useState(false)
  // Fiche ouverte : dans l'adresse (?demande=<id>), pour le lien envoyé par
  // la notification (n8n) et pour que le bouton retour ferme la fiche.
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('demande')
  const setSelectedId = (id: string | null) => setParams(id ? { demande: id } : {}, { replace: false })
  const selected = selectedId ? data.compositions.find((c) => c.id === selectedId) ?? null : null

  const waiting = data.loading ? (
    <p className="py-12 text-center text-base text-muted">Chargement…</p>
  ) : data.error ? (
    <p className="py-12 text-center text-base text-slate">Erreur : {data.error}</p>
  ) : null

  const demandes =
    waiting ??
    (selected ? (
      <RequestDetail
        composition={selected}
        compItems={data.compItems}
        compOptions={data.compOptions}
        steps={data.steps}
        items={data.items}
        options={data.options}
        formules={data.formules}
        onBack={() => setSelectedId(null)}
        onChanged={data.refresh}
      />
    ) : (
      <>
        {selectedId && (
          <p className="mb-4 rounded-card border border-lin bg-fond p-3 text-base text-muted">
            Cette demande est introuvable (supprimée entre-temps ?).
          </p>
        )}
        <RequestsList
          compositions={data.compositions}
          statusNotes={data.statusNotes}
          formules={data.formules}
          steps={data.steps}
          view={listView}
          onViewChange={setListView}
          onOpen={(id) => setSelectedId(id)}
          onChanged={data.refresh}
        />
        {/* Bouton flottant, à portée de pouce */}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="fixed bottom-5 right-5 z-30 flex min-h-14 items-center gap-2 rounded-full bg-slate px-5 text-base font-bold text-lin shadow-lg hover:bg-slate-deep"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            +
          </span>{' '}
          Ajouter un contact
        </button>
        {adding && (
          <AddContactSheet
            compositions={data.compositions}
            onClose={() => setAdding(false)}
            onCreated={data.refresh}
            onOpen={(id) => {
              setAdding(false)
              setSelectedId(id)
            }}
          />
        )}
      </>
    ))

  const stats = waiting ?? (
    <StatsPanel compositions={data.compositions} statusNotes={data.statusNotes} compItems={data.compItems} items={data.items} />
  )

  return (
    <div className="min-h-screen bg-lin-light pb-24">
      <header className="border-b border-lin bg-fond" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate">J&amp;J Traiteur</p>
            <h1 className="font-display text-xl text-slate">Vos demandes</h1>
          </div>
          <button type="button" onClick={() => supabase.auth.signOut()} className="min-h-11 text-base text-muted hover:text-ink">
            Se déconnecter
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5" aria-label="Espace traiteur">
          <Tab to="/admin" end>
            Demandes
          </Tab>
          <Tab to="/admin/statistiques">Statistiques</Tab>
          <Tab to="/admin/liens">Mes liens</Tab>
        </nav>
      </header>
      <InstallBanner />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-5">
        <Routes>
          <Route path="statistiques" element={stats} />
          <Route path="liens" element={<LinksPage />} />
          <Route path="*" element={demandes} />
        </Routes>
      </main>
    </div>
  )
}

function Tab({ to, end, children }: { to: string; end?: boolean; children: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 text-base font-medium transition-colors ${
          isActive ? 'border-slate text-ink' : 'border-transparent text-muted hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

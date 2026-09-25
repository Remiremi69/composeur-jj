import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Formule, Inclusion, Item, Option, Step } from '../types/db'

export interface CatalogState {
  formules: Formule[]
  steps: Step[]
  items: Item[]
  options: Option[]
  inclusions: Inclusion[]
  traiteurPhone: string | null // source unique : secret TRAITEUR_PHONE (via public-config)
  loading: boolean
  error: string | null
}

const EMPTY: CatalogState = {
  formules: [],
  steps: [],
  items: [],
  options: [],
  inclusions: [],
  traiteurPhone: null,
  loading: true,
  error: null,
}

// eslint-disable-next-line react-refresh/only-export-components
export const CatalogContext = createContext<CatalogState | null>(null)

async function loadCatalog(): Promise<CatalogState> {
  // Filtre explicite sur les éléments actifs : un admin connecté dans le même
  // navigateur a le droit de lire les inactifs (back-office), mais le
  // parcours public ne doit jamais les proposer.
  const [formules, steps, items, options, inclusions, config] = await Promise.all([
    supabase.from('formules').select('*').eq('is_active', true).order('position', { ascending: true }),
    supabase.from('steps').select('*').order('position', { ascending: true }),
    supabase.from('items').select('*').eq('is_active', true).order('position', { ascending: true }),
    supabase.from('options').select('*').eq('is_active', true).order('position', { ascending: true }),
    supabase.from('inclusions').select('*').eq('is_active', true).order('position', { ascending: true }),
    // Facultatif : sans le téléphone, le site fonctionne (message sans numéro).
    supabase.functions.invoke('public-config', { method: 'GET' }).catch(() => ({ data: null })),
  ])

  // Options et inclusions sont facultatives : pas d'erreur bloquante.
  const error = formules.error?.message ?? steps.error?.message ?? items.error?.message ?? null
  const phone = (config as { data?: { traiteurPhone?: unknown } | null }).data?.traiteurPhone

  return {
    formules: formules.data ?? [],
    steps: steps.data ?? [],
    items: items.data ?? [],
    options: options.data ?? [],
    inclusions: inclusions.data ?? [],
    traiteurPhone: typeof phone === 'string' && phone ? phone : null,
    loading: false,
    error,
  }
}

// Charge le catalogue UNE seule fois pour toute l'application.
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogState>(EMPTY)

  useEffect(() => {
    let cancelled = false
    loadCatalog()
      .then((s) => {
        if (!cancelled) setState(s)
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ ...EMPTY, loading: false, error: String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog doit être utilisé dans <CatalogProvider>')
  return ctx
}

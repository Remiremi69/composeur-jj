import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Composition,
  CompositionItem,
  CompositionOption,
  Formule,
  Item,
  Option,
  Step,
} from '../types/db'

interface AdminData {
  compositions: Composition[]
  compItems: CompositionItem[]
  compOptions: CompositionOption[]
  formules: Formule[]
  steps: Step[]
  items: Item[]
  options: Option[]
  draftsCount: number // menus commencés mais pas encore envoyés
  loading: boolean
  error: string | null
  refresh: () => void
}

// Récupère tout le nécessaire au back-office : demandes reçues + catalogue.
// Accessible uniquement à l'admin authentifié (RLS).
export function useAdminData(): AdminData {
  const [state, setState] = useState<Omit<AdminData, 'refresh'>>({
    compositions: [],
    compItems: [],
    compOptions: [],
    formules: [],
    steps: [],
    items: [],
    options: [],
    draftsCount: 0,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    const [comps, cItems, cOptions, formules, steps, items, options, drafts] = await Promise.all([
      // Seules les demandes ENVOYÉES : les brouillons fausseraient la liste et les stats.
      supabase
        .from('compositions')
        .select('*')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false }),
      supabase.from('composition_items').select('*'),
      supabase.from('composition_options').select('*'),
      supabase.from('formules').select('*').order('position', { ascending: true }),
      supabase.from('steps').select('*').order('position', { ascending: true }),
      supabase.from('items').select('*').order('position', { ascending: true }),
      supabase.from('options').select('*').order('position', { ascending: true }),
      supabase.from('compositions').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    ])

    const error =
      comps.error?.message ??
      cItems.error?.message ??
      cOptions.error?.message ??
      formules.error?.message ??
      steps.error?.message ??
      items.error?.message ??
      options.error?.message ??
      null

    setState({
      compositions: comps.data ?? [],
      compItems: cItems.data ?? [],
      compOptions: cOptions.data ?? [],
      formules: formules.data ?? [],
      steps: steps.data ?? [],
      items: items.data ?? [],
      options: options.data ?? [],
      draftsCount: drafts.count ?? 0,
      loading: false,
      error,
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refresh: load }
}

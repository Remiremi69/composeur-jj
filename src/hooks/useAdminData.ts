import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Composition,
  CompositionItem,
  CompositionNote,
  CompositionOption,
  Formule,
  Item,
  Option,
  Step,
} from '../types/db'

interface AdminData {
  compositions: Composition[] // envoyées ET brouillons (onglet « Menus en cours »), tests compris
  statusNotes: CompositionNote[] // historique des statuts (entonnoir)
  compItems: CompositionItem[]
  compOptions: CompositionOption[]
  formules: Formule[]
  steps: Step[]
  items: Item[]
  options: Option[]
  loading: boolean
  error: string | null
  refresh: () => void
}

// Récupère tout le nécessaire au back-office : demandes, brouillons,
// historique des statuts et catalogue. Les tests (is_test) sont filtrés à
// l'affichage et dans les statistiques, pas ici.
// Accessible uniquement à l'admin authentifié (RLS).
export function useAdminData(): AdminData {
  const [state, setState] = useState<Omit<AdminData, 'refresh'>>({
    compositions: [],
    statusNotes: [],
    compItems: [],
    compOptions: [],
    formules: [],
    steps: [],
    items: [],
    options: [],
    loading: true,
    error: null,
  })

  // Premier chargement : écran « Chargement… » (état initial). Les
  // rechargements suivants (après un changement de statut, une note…) se font
  // en arrière-plan, sans démonter la fiche ouverte.
  const load = useCallback(async () => {
    const [comps, notes, cItems, cOptions, formules, steps, items, options] = await Promise.all([
      supabase.from('compositions').select('*').order('created_at', { ascending: false }),
      supabase
        .from('composition_notes')
        .select('*')
        .eq('kind', 'statut')
        .order('created_at', { ascending: true }),
      supabase.from('composition_items').select('*'),
      supabase.from('composition_options').select('*'),
      supabase.from('formules').select('*').order('position', { ascending: true }),
      supabase.from('steps').select('*').order('position', { ascending: true }),
      supabase.from('items').select('*').order('position', { ascending: true }),
      supabase.from('options').select('*').order('position', { ascending: true }),
    ])

    const error =
      comps.error?.message ??
      notes.error?.message ??
      cItems.error?.message ??
      cOptions.error?.message ??
      formules.error?.message ??
      steps.error?.message ??
      items.error?.message ??
      options.error?.message ??
      null

    setState({
      compositions: comps.data ?? [],
      statusNotes: notes.data ?? [],
      compItems: cItems.data ?? [],
      compOptions: cOptions.data ?? [],
      formules: formules.data ?? [],
      steps: steps.data ?? [],
      items: items.data ?? [],
      options: options.data ?? [],
      loading: false,
      error,
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refresh: load }
}

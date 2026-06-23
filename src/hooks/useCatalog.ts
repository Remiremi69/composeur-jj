import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Item, Step } from '../types/db'

interface CatalogState {
  steps: Step[]
  items: Item[]
  loading: boolean
  error: string | null
}

// Récupère le catalogue (étapes + plats actifs) depuis Supabase.
// Lecture seule, protégée par les politiques RLS publiques.
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    steps: [],
    items: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [stepsRes, itemsRes] = await Promise.all([
        supabase.from('steps').select('*').order('position', { ascending: true }),
        supabase.from('items').select('*').order('position', { ascending: true }),
      ])

      if (cancelled) return

      const error = stepsRes.error?.message ?? itemsRes.error?.message ?? null
      setState({
        steps: stepsRes.data ?? [],
        items: itemsRes.data ?? [],
        loading: false,
        error,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

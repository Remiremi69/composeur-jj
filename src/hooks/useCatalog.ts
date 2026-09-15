import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Formule, Inclusion, Item, Option, Step } from '../types/db'

interface CatalogState {
  formules: Formule[]
  steps: Step[]
  items: Item[]
  options: Option[]
  inclusions: Inclusion[]
  loading: boolean
  error: string | null
}

// Récupère le catalogue (formules + étapes + plats actifs) depuis Supabase.
// Lecture seule, protégée par les politiques RLS publiques.
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    formules: [],
    steps: [],
    items: [],
    options: [],
    inclusions: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [formulesRes, stepsRes, itemsRes, optionsRes, inclusionsRes] = await Promise.all([
        supabase.from('formules').select('*').order('position', { ascending: true }),
        supabase.from('steps').select('*').order('position', { ascending: true }),
        supabase.from('items').select('*').order('position', { ascending: true }),
        supabase.from('options').select('*').order('position', { ascending: true }),
        supabase.from('inclusions').select('*').order('position', { ascending: true }),
      ])

      if (cancelled) return

      // Options et inclusions sont facultatives : si la table n'existe pas
      // encore, on n'affiche pas d'erreur bloquante, on continue sans.
      const error =
        formulesRes.error?.message ??
        stepsRes.error?.message ??
        itemsRes.error?.message ??
        null

      setState({
        formules: formulesRes.data ?? [],
        steps: stepsRes.data ?? [],
        items: itemsRes.data ?? [],
        options: optionsRes.data ?? [],
        inclusions: inclusionsRes.data ?? [],
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

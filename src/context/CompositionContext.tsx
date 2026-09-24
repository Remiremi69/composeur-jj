import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Item, Selections, Step } from '../types/db'
import { toggleSelection } from '../lib/rules'

// Infos saisies par le couple à l'accueil.
export interface CoupleInfo {
  coupleNames: string
  email: string
  weddingDate: string
  guestCount: number
}

interface PersistedState {
  couple: CoupleInfo | null
  formuleId: string | null
  selections: Selections
  optionIds: string[]
  startedAt?: number | null
}

interface CompositionContextValue {
  couple: CoupleInfo | null
  setCouple: (couple: CoupleInfo) => void
  formuleId: string | null
  setFormule: (formuleId: string) => void
  selections: Selections
  toggleItem: (step: Step, stepItems: Item[], item: Item) => void
  setQuantity: (itemId: string, qty: number) => void
  removeItem: (itemId: string) => void
  optionIds: string[]
  toggleOption: (optionId: string) => void
  // Horodatage (horloge du navigateur) du début de la composition, envoyé
  // avec la soumission pour écarter les robots trop rapides.
  startedAt: number | null
  reset: () => void
}

const STORAGE_KEY = 'composeur:v3'

const CompositionContext = createContext<CompositionContextValue | null>(null)

function loadInitial(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedState
  } catch {
    // localStorage indisponible ou JSON invalide : on repart à vide.
  }
  return { couple: null, formuleId: null, selections: {}, optionIds: [] }
}

export function CompositionProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial()
  const [couple, setCoupleState] = useState<CoupleInfo | null>(initial.couple)
  const [formuleId, setFormuleState] = useState<string | null>(initial.formuleId)
  const [selections, setSelections] = useState<Selections>(initial.selections)
  const [optionIds, setOptionIds] = useState<string[]>(initial.optionIds ?? [])
  const [startedAt, setStartedAt] = useState<number | null>(initial.startedAt ?? null)

  // Persistance navigateur : un rafraîchissement ne perd rien.
  useEffect(() => {
    const state: PersistedState = { couple, formuleId, selections, optionIds, startedAt }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore (mode privé, quota…)
    }
  }, [couple, formuleId, selections, optionIds, startedAt])

  const setCouple = useCallback((next: CoupleInfo) => {
    setCoupleState(next)
    // On garde le premier horodatage : modifier ses infos ne le réinitialise pas.
    setStartedAt((prev) => prev ?? Date.now())
  }, [])

  const setFormule = useCallback((id: string) => setFormuleState(id), [])

  const toggleOption = useCallback((optionId: string) => {
    setOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    )
  }, [])

  const toggleItem = useCallback(
    (step: Step, stepItems: Item[], item: Item) => {
      setSelections((prev) => toggleSelection(step, stepItems, prev, item))
    },
    [],
  )

  const setQuantity = useCallback((itemId: string, qty: number) => {
    setSelections((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[itemId]
      else next[itemId] = qty
      return next
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setSelections((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setCoupleState(null)
    setFormuleState(null)
    setSelections({})
    setOptionIds([])
    setStartedAt(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo<CompositionContextValue>(
    () => ({
      couple,
      setCouple,
      formuleId,
      setFormule,
      selections,
      toggleItem,
      setQuantity,
      removeItem,
      optionIds,
      toggleOption,
      startedAt,
      reset,
    }),
    [
      couple,
      setCouple,
      formuleId,
      setFormule,
      selections,
      toggleItem,
      setQuantity,
      removeItem,
      optionIds,
      toggleOption,
      startedAt,
      reset,
    ],
  )

  return <CompositionContext.Provider value={value}>{children}</CompositionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useComposition(): CompositionContextValue {
  const ctx = useContext(CompositionContext)
  if (!ctx) {
    throw new Error('useComposition doit être utilisé dans <CompositionProvider>')
  }
  return ctx
}

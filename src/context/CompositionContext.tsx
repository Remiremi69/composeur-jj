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
  selections: Selections
}

interface CompositionContextValue {
  couple: CoupleInfo | null
  setCouple: (couple: CoupleInfo) => void
  selections: Selections
  toggleItem: (step: Step, stepItems: Item[], item: Item) => void
  setQuantity: (itemId: string, qty: number) => void
  removeItem: (itemId: string) => void
  reset: () => void
}

const STORAGE_KEY = 'composeur:v1'

const CompositionContext = createContext<CompositionContextValue | null>(null)

function loadInitial(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedState
  } catch {
    // localStorage indisponible ou JSON invalide : on repart à vide.
  }
  return { couple: null, selections: {} }
}

export function CompositionProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial()
  const [couple, setCoupleState] = useState<CoupleInfo | null>(initial.couple)
  const [selections, setSelections] = useState<Selections>(initial.selections)

  // Persistance navigateur : un rafraîchissement ne perd rien.
  useEffect(() => {
    const state: PersistedState = { couple, selections }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore (mode privé, quota…)
    }
  }, [couple, selections])

  const setCouple = useCallback((next: CoupleInfo) => setCoupleState(next), [])

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
    setSelections({})
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo<CompositionContextValue>(
    () => ({ couple, setCouple, selections, toggleItem, setQuantity, removeItem, reset }),
    [couple, setCouple, selections, toggleItem, setQuantity, removeItem, reset],
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

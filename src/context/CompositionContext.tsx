import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Item, Selections, Step } from '../types/db'
import { toggleSelection } from '../lib/rules'
import { createDraft, updateDraft } from '../lib/drafts'
import { getAttribution } from '../lib/attribution'

// Infos saisies par le couple à l'accueil.
export interface CoupleInfo {
  coupleNames: string
  email: string
  weddingDate: string
  guestCount: number
}

// Infos « Pour vous recontacter », saisies sur la page récap. Conservées
// dans le navigateur, jamais envoyées dans le brouillon : seulement à l'envoi.
export interface ContactInfo {
  phone: string
  venue: string
  dietaryNotes: string
  message: string
}

// État de la sauvegarde automatique (indicateur discret).
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

// Brouillon récupéré via /reprendre/:token.
export interface ResumedDraft {
  shareToken: string
  compositionId: string
  couple: CoupleInfo
  formuleId: string | null
  currentStep: string | null
  selections: Selections
  optionIds: string[]
}

const EMPTY_CONTACT: ContactInfo = { phone: '', venue: '', dietaryNotes: '', message: '' }

interface PersistedState {
  couple: CoupleInfo | null
  formuleId: string | null
  selections: Selections
  optionIds: string[]
  startedAt?: number | null
  currentStep?: string | null
  contact?: ContactInfo
  shareToken?: string | null
  compositionId?: string | null
  submittedToken?: string | null
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
  // Étape en cours : slug d'étape ou page (« formule », « options », « recap »).
  currentStep: string | null
  setCurrentStep: (step: string) => void
  contact: ContactInfo
  setContact: (patch: Partial<ContactInfo>) => void
  // Brouillon côté serveur
  shareToken: string | null
  compositionId: string | null
  submittedToken: string | null // jeton du menu envoyé (lien /menu/:token)
  saveStatus: SaveStatus
  startDraft: (turnstileToken: string | null) => void
  resumeDraft: (draft: ResumedDraft) => void
  markSubmitted: (shareToken: string) => void
  // Nettoyage des éléments qui ne sont plus au catalogue
  applySanitized: (s: { formuleId: string | null; selections: Selections; optionIds: string[] }) => void
  sanitizeKey: number // change à chaque restauration : relance le nettoyage
  notice: string | null
  setNotice: (message: string | null) => void
  reset: () => void
}

const STORAGE_KEY = 'composeur:v3'
const AUTOSAVE_DELAY_MS = 2000
const MAX_CREATE_ATTEMPTS = 3

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

// Ce qui est sauvegardé dans le brouillon (sert à savoir s'il y a du nouveau).
function serialize(s: {
  couple: CoupleInfo | null
  formuleId: string | null
  selections: Selections
  optionIds: string[]
  currentStep: string | null
}): string {
  return JSON.stringify([s.couple, s.formuleId, s.selections, s.optionIds, s.currentStep])
}

export function CompositionProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitial)
  const [couple, setCoupleState] = useState<CoupleInfo | null>(initial.couple)
  const [formuleId, setFormuleState] = useState<string | null>(initial.formuleId)
  const [selections, setSelections] = useState<Selections>(initial.selections ?? {})
  const [optionIds, setOptionIds] = useState<string[]>(initial.optionIds ?? [])
  const [startedAt, setStartedAt] = useState<number | null>(initial.startedAt ?? null)
  const [currentStep, setCurrentStepState] = useState<string | null>(initial.currentStep ?? null)
  const [contact, setContactState] = useState<ContactInfo>({ ...EMPTY_CONTACT, ...initial.contact })
  const [shareToken, setShareToken] = useState<string | null>(initial.shareToken ?? null)
  const [compositionId, setCompositionId] = useState<string | null>(initial.compositionId ?? null)
  const [submittedToken, setSubmittedToken] = useState<string | null>(initial.submittedToken ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initial.shareToken ? 'saved' : 'idle')
  const [sanitizeKey, setSanitizeKey] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  // Persistance navigateur : un rafraîchissement ne perd rien.
  useEffect(() => {
    const state: PersistedState = {
      couple,
      formuleId,
      selections,
      optionIds,
      startedAt,
      currentStep,
      contact,
      shareToken,
      compositionId,
      submittedToken,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore (mode privé, quota…)
    }
  }, [couple, formuleId, selections, optionIds, startedAt, currentStep, contact, shareToken, compositionId, submittedToken])

  // ------------------------------------------------------------------
  // Sauvegarde automatique du brouillon
  // ------------------------------------------------------------------
  const snapshot = useMemo(
    () => serialize({ couple, formuleId, selections, optionIds, currentStep }),
    [couple, formuleId, selections, optionIds, currentStep],
  )
  // Au chargement, un brouillon existant est considéré comme à jour.
  const lastSavedRef = useRef<string | null>(
    initial.shareToken
      ? serialize({
          couple: initial.couple,
          formuleId: initial.formuleId,
          selections: initial.selections ?? {},
          optionIds: initial.optionIds ?? [],
          currentStep: initial.currentStep ?? null,
        })
      : null,
  )
  const latestRef = useRef({ couple, formuleId, selections, optionIds, currentStep, shareToken, submittedToken, snapshot })
  latestRef.current = { couple, formuleId, selections, optionIds, currentStep, shareToken, submittedToken, snapshot }
  const savingRef = useRef(false)
  const resaveRef = useRef(false)
  const createAttemptsRef = useRef(0)
  const turnstileRef = useRef<string | null>(null)
  const saveNowRef = useRef<() => Promise<void>>(async () => {})

  const saveNow = useCallback(async (): Promise<void> => {
    if (savingRef.current) {
      resaveRef.current = true
      return
    }
    const s = latestRef.current
    if (!s.couple || s.submittedToken) return
    savingRef.current = true
    setSaveStatus('saving')
    try {
      let token = s.shareToken
      if (!token) {
        // Création (au plus quelques tentatives par session).
        if (createAttemptsRef.current >= MAX_CREATE_ATTEMPTS) {
          setSaveStatus('error')
          return
        }
        createAttemptsRef.current += 1
        const created = await createDraft({
          couple: s.couple,
          ...getAttribution(),
          turnstileToken: turnstileRef.current,
        })
        turnstileRef.current = null // un jeton Turnstile ne sert qu'une fois
        if (!created) {
          setSaveStatus('error')
          return
        }
        token = created.shareToken
        setShareToken(created.shareToken)
        setCompositionId(created.compositionId)
      }

      const result = await updateDraft(token, {
        couple: s.couple,
        formuleId: s.formuleId,
        lastStep: s.currentStep,
        clientState: { selections: s.selections, optionIds: s.optionIds, currentStep: s.currentStep },
      })
      if (result === 'ok') {
        lastSavedRef.current = s.snapshot
        setSaveStatus(latestRef.current.snapshot === s.snapshot ? 'saved' : 'pending')
      } else if (result === 'not_draft') {
        // Déjà envoyé (ou supprimé) : on arrête de sauvegarder ce brouillon.
        setShareToken(null)
        setCompositionId(null)
        createAttemptsRef.current = MAX_CREATE_ATTEMPTS
        setSaveStatus('idle')
      } else {
        setSaveStatus('error') // nouvelle tentative au changement suivant
      }
    } finally {
      savingRef.current = false
      if (resaveRef.current) {
        resaveRef.current = false
        void saveNowRef.current()
      }
    }
  }, [])
  saveNowRef.current = saveNow

  // 2 s après le dernier changement, on sauvegarde (jamais bloquant).
  useEffect(() => {
    if (!couple || submittedToken) return
    if (snapshot === lastSavedRef.current) return
    setSaveStatus((prev) => (prev === 'saving' ? prev : 'pending'))
    const timer = setTimeout(() => void saveNowRef.current(), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [snapshot, couple, submittedToken])

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const setCouple = useCallback((next: CoupleInfo) => {
    setCoupleState(next)
    // On garde le premier horodatage : modifier ses infos ne le réinitialise pas.
    setStartedAt((prev) => prev ?? Date.now())
  }, [])

  // Appelé après validation de l'accueil : le brouillon sera créé à la
  // prochaine sauvegarde (avec le jeton Turnstile s'il y en a un).
  const startDraft = useCallback((turnstileToken: string | null) => {
    turnstileRef.current = turnstileToken
    createAttemptsRef.current = 0
    setSubmittedToken(null)
  }, [])

  const setFormule = useCallback((id: string) => setFormuleState(id), [])
  const setCurrentStep = useCallback((step: string) => setCurrentStepState(step), [])
  const setContact = useCallback(
    (patch: Partial<ContactInfo>) => setContactState((prev) => ({ ...prev, ...patch })),
    [],
  )

  const toggleOption = useCallback((optionId: string) => {
    setOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    )
  }, [])

  const toggleItem = useCallback((step: Step, stepItems: Item[], item: Item) => {
    setSelections((prev) => toggleSelection(step, stepItems, prev, item))
  }, [])

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

  const resumeDraft = useCallback((d: ResumedDraft) => {
    const sameDraft = latestRef.current.shareToken === d.shareToken
    setCoupleState(d.couple)
    setFormuleState(d.formuleId)
    setSelections(d.selections)
    setOptionIds(d.optionIds)
    setCurrentStepState(d.currentStep)
    setShareToken(d.shareToken)
    setCompositionId(d.compositionId)
    setSubmittedToken(null)
    setStartedAt(Date.now())
    if (!sameDraft) setContactState(EMPTY_CONTACT)
    lastSavedRef.current = serialize({
      couple: d.couple,
      formuleId: d.formuleId,
      selections: d.selections,
      optionIds: d.optionIds,
      currentStep: d.currentStep,
    })
    createAttemptsRef.current = 0
    setSaveStatus('saved')
    setSanitizeKey((k) => k + 1)
  }, [])

  const markSubmitted = useCallback((token: string) => {
    setSubmittedToken(token)
    setShareToken(null)
    setCompositionId(null)
    setSaveStatus('idle')
  }, [])

  const applySanitized = useCallback(
    (s: { formuleId: string | null; selections: Selections; optionIds: string[] }) => {
      setFormuleState(s.formuleId)
      setSelections(s.selections)
      setOptionIds(s.optionIds)
    },
    [],
  )

  const reset = useCallback(() => {
    setCoupleState(null)
    setFormuleState(null)
    setSelections({})
    setOptionIds([])
    setStartedAt(null)
    setCurrentStepState(null)
    setContactState(EMPTY_CONTACT)
    setShareToken(null)
    setCompositionId(null)
    setSubmittedToken(null)
    setSaveStatus('idle')
    setNotice(null)
    lastSavedRef.current = null
    createAttemptsRef.current = 0
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
      currentStep,
      setCurrentStep,
      contact,
      setContact,
      shareToken,
      compositionId,
      submittedToken,
      saveStatus,
      startDraft,
      resumeDraft,
      markSubmitted,
      applySanitized,
      sanitizeKey,
      notice,
      setNotice,
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
      currentStep,
      setCurrentStep,
      contact,
      setContact,
      shareToken,
      compositionId,
      submittedToken,
      saveStatus,
      startDraft,
      resumeDraft,
      markSubmitted,
      applySanitized,
      sanitizeKey,
      notice,
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

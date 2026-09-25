import { useEffect, useRef } from 'react'
import { sanitizeState } from '@core/draft'
import { useComposition } from '../context/CompositionContext'
import { useCatalog } from '../hooks/useCatalog'

const REMOVED_MESSAGE =
  'Certains plats ne sont plus proposés et ont été retirés de votre sélection.'

// Au chargement (et après chaque reprise de brouillon), retire de l'état
// sauvegardé la formule, les plats ou les options qui ne sont plus au
// catalogue actif, et le signale discrètement.
export default function CatalogGuard() {
  const { formules, items, options, loading, error } = useCatalog()
  const { couple, formuleId, selections, optionIds, applySanitized, sanitizeKey, notice, setNotice } =
    useComposition()
  const checkedKey = useRef<number | null>(null)

  useEffect(() => {
    if (loading || error || checkedKey.current === sanitizeKey) return
    checkedKey.current = sanitizeKey
    if (!couple) return
    const result = sanitizeState({ formules, items, options }, { formuleId, selections, optionIds })
    if (result.removed) {
      applySanitized(result)
      setNotice(REMOVED_MESSAGE)
    }
  }, [loading, error, sanitizeKey, couple, formules, items, options, formuleId, selections, optionIds, applySanitized, setNotice])

  if (!notice) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-3 z-50 mx-auto flex w-[min(92%,32rem)] items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[var(--shadow-card)]"
    >
      <p className="flex-1">{notice}</p>
      <button
        type="button"
        onClick={() => setNotice(null)}
        aria-label="Fermer ce message"
        className="text-muted hover:text-ink"
      >
        ×
      </button>
    </div>
  )
}

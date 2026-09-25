import { useComposition } from '../context/CompositionContext'

// Indicateur discret de la sauvegarde automatique du brouillon.
// En cas d'échec, on n'affiche rien : la sauvegarde réessaiera au prochain
// changement, sans jamais inquiéter ni bloquer le couple.
export default function SaveIndicator() {
  const { saveStatus, shareToken } = useComposition()

  let text: string | null = null
  if (saveStatus === 'pending' || saveStatus === 'saving') text = 'Enregistrement…'
  else if (saveStatus === 'saved' && shareToken) text = 'Menu enregistré ✓'

  return (
    <span aria-live="polite" className="text-xs text-muted">
      {text}
    </span>
  )
}

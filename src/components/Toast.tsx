import { useCallback, useEffect, useRef, useState } from 'react'

// Message éphémère, annoncé aux lecteurs d'écran (aria-live).
// La zone est TOUJOURS présente dans la page : c'est ce qui permet aux
// lecteurs d'écran d'annoncer chaque nouveau message.
export default function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-40 z-40 flex justify-center px-4"
    >
      {message && (
        <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-card bg-ink px-4 py-3 text-sm text-cream shadow-[var(--shadow-card-hover)]">
          <p className="flex-1">{message}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le message"
            className="text-cream/80 hover:text-cream"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// Affiche un message pendant quelques secondes.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(durationMs = 4500) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const clear = useCallback(() => {
    clearTimeout(timer.current)
    setMessage(null)
  }, [])

  const show = useCallback(
    (text: string) => {
      clearTimeout(timer.current)
      setMessage(text)
      timer.current = setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs],
  )

  useEffect(() => () => clearTimeout(timer.current), [])
  return { message, show, clear }
}

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { Screen } from '@core/journey'

// Frise des étapes : fait / en cours / à venir. On peut revenir à toute étape
// accessible ; aller plus loin n'est possible que si l'étape en cours est
// validée (maxReachable). Sur mobile : barre défilante centrée sur l'étape
// en cours.
export default function StepTrail({
  screens,
  currentIndex,
  maxReachable,
  validity,
  onSelect,
}: {
  screens: Screen[]
  currentIndex: number
  maxReachable: number
  validity: boolean[]
  onSelect: (index: number) => void
}) {
  const currentRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = currentRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }, [currentIndex, reduceMotion])

  return (
    <nav aria-label="Étapes de votre menu" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ol className="flex w-max gap-1.5">
        {screens.map((screen, i) => {
          const current = i === currentIndex
          const done = !current && validity[i]
          const reachable = i <= maxReachable
          const stateLabel = current ? 'étape en cours' : done ? 'faite' : 'à venir'
          return (
            <li key={screen.slug}>
              <button
                ref={current ? currentRef : undefined}
                type="button"
                onClick={() => onSelect(i)}
                disabled={!reachable || current}
                aria-current={current ? 'step' : undefined}
                aria-label={`${i + 1}. ${screen.navTitle} — ${stateLabel}`}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  current
                    ? 'border-accent bg-accent text-cream'
                    : done
                      ? 'border-line bg-surface text-ink hover:border-accent'
                      : reachable
                        ? 'border-line bg-surface text-muted hover:border-accent'
                        : 'cursor-not-allowed border-line bg-transparent text-muted'
                }`}
              >
                <span aria-hidden="true">{done ? '✓' : i + 1}</span>
                {screen.navTitle}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

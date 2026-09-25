import { useId, useState } from 'react'

export interface IncludedGroup {
  title: string
  items: { name: string; description: string | null }[]
}

// Encart « Déjà compris dans votre formule » : contenu des étapes où il n'y a
// rien à choisir (boissons, grignotage, café…). Dépliable sur la page des
// formules, toujours visible au récapitulatif et sur la page menu.
export default function IncludedInFormule({
  groups,
  collapsible = false,
}: {
  groups: IncludedGroup[]
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)
  const panelId = useId()
  if (groups.length === 0) return null

  const content = (
    <div id={panelId} className="mt-3 flex flex-col gap-3 text-left">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="text-xs uppercase tracking-[0.15em] text-muted">{g.title}</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {g.items.map((it) => (
              <li key={it.name} className="text-sm text-ink">
                <span className="text-accent" aria-hidden="true">✓ </span>
                {it.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )

  return (
    <div className="rounded-card border border-line bg-cream/60 p-4">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between text-sm font-medium text-ink"
        >
          Déjà compris dans votre formule
          <span aria-hidden="true" className="text-accent">{open ? '▴' : '▾'}</span>
        </button>
      ) : (
        <h2 className="text-sm font-medium text-ink">Déjà compris dans votre formule</h2>
      )}
      {open && content}
    </div>
  )
}

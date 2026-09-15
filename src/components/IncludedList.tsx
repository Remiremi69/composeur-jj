import type { Item } from '../types/db'

// Affiche des prestations INCLUSES dans la formule (aucun choix à faire) :
// boissons du vin d'honneur, grignotage, café & douceurs…
export default function IncludedList({ items }: { items: Item[] }) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="rounded-card bg-cream px-4 py-3 text-sm text-muted">
        Ces prestations sont <span className="font-medium text-accent">incluses</span> dans
        votre formule — rien à choisir ici.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-start gap-3 rounded-card border border-line bg-surface p-4"
          >
            <span className="mt-0.5 shrink-0 text-accent">✓</span>
            <div>
              <p className="font-display text-base text-ink">{it.name}</p>
              {it.description && <p className="mt-0.5 text-sm text-muted">{it.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import type { Inclusion } from '../types/db'

// Panneau "ce qui est toujours compris" : vaisselle, nappage, équipe…
// Regroupé par famille, dans l'ordre de la base.
export default function InclusionsPanel({ inclusions }: { inclusions: Inclusion[] }) {
  if (!inclusions.length) return null

  const groups: { label: string; items: Inclusion[] }[] = []
  for (const inc of inclusions) {
    let g = groups.find((x) => x.label === inc.group_label)
    if (!g) {
      g = { label: inc.group_label, items: [] }
      groups.push(g)
    }
    g.items.push(inc)
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h2 className="font-display text-lg text-ink">Compris dans toutes nos prestations</h2>
      <p className="mt-1 text-sm text-muted">
        Sans mauvaise surprise — tout ceci est déjà inclus dans le prix par personne.
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label}>
            <h3 className="text-xs uppercase tracking-[0.15em] text-accent">{g.label}</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {g.items.map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-sm text-ink">
                  <span className="mt-0.5 shrink-0 text-accent">✓</span>
                  <span>{i.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

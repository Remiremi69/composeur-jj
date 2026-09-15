import type { Composition, CompositionItem, Formule, Item } from '../types/db'

export interface NamedCount {
  name: string
  count: number
}

// Nombre de demandes sur les 30 derniers jours.
export function requestsLast30Days(comps: Composition[]): number {
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000
  return comps.filter((c) => new Date(c.created_at).getTime() >= cutoff).length
}

// Panier moyen (estimation moyenne par demande).
export function averageBasket(comps: Composition[]): number {
  const vals = comps.map((c) => c.total_estimate ?? 0).filter((v) => v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Panier moyen par personne.
export function averagePerPerson(comps: Composition[]): number {
  const vals = comps
    .filter((c) => (c.total_estimate ?? 0) > 0 && (c.guest_count ?? 0) > 0)
    .map((c) => (c.total_estimate as number) / (c.guest_count as number))
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Nombre de convives moyen.
export function averageGuests(comps: Composition[]): number {
  const vals = comps.map((c) => c.guest_count ?? 0).filter((v) => v > 0)
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

// Répartition des demandes par formule.
export function byFormule(comps: Composition[], formules: Formule[]): NamedCount[] {
  return formules
    .map((f) => ({ name: f.name, count: comps.filter((c) => c.formule_id === f.id).length }))
    .filter((s) => s.count > 0)
}

// Plats les plus choisis (toutes demandes confondues).
export function topDishes(
  compItems: CompositionItem[],
  items: Item[],
  limit = 10,
): NamedCount[] {
  const nameById = new Map(items.map((i) => [i.id, i.name]))
  const counts = new Map<string, number>()
  for (const ci of compItems) {
    const name = nameById.get(ci.item_id)
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

import { formatAllergen } from '../lib/format'

// Petits badges d'allergènes. Les valeurs viennent de la base (item.allergens).
export default function AllergenBadges({ allergens }: { allergens: string[] }) {
  if (!allergens || allergens.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map((a) => (
        <span
          key={a}
          className="rounded-full bg-cream px-2 py-0.5 text-[11px] capitalize text-muted"
        >
          {formatAllergen(a)}
        </span>
      ))}
    </div>
  )
}

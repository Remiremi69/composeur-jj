// Placeholder élégant affiché quand un plat n'a pas (encore) de photo.
// Visuel sobre et cohérent, aux tokens du thème. Les vraies photos
// remplaceront simplement ce composant via item.photo_url.
export default function DishPlaceholder() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background:
          'linear-gradient(135deg, var(--color-cream) 0%, var(--color-line) 100%)',
      }}
      aria-hidden
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      >
        {/* petite branche d'olivier stylisée */}
        <path d="M12 21c0-6 0-12 4-16" />
        <path d="M16 6c2 0 3.5-1 4-3-2 0-3.5 1-4 3Z" />
        <path d="M14 10c2 .3 3.7-.5 4.5-2.3-1.9-.6-3.6 0-4.5 2.3Z" />
        <path d="M13 14c1.8.6 3.6.2 4.7-1.4-1.7-1-3.5-.7-4.7 1.4Z" />
      </svg>
    </div>
  )
}

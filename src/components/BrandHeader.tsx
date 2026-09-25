import { useState } from 'react'

const LOGO_SRC = '/brand/jj-logo-slate.png'
const SITE_URL = import.meta.env.VITE_TRAITEUR_SITE_URL as string | undefined

// Logo J&J (lien vers le site vitrine). Si le fichier du logo est absent,
// repli sur le nom en typographie élégante.
export default function BrandHeader() {
  const [logoOk, setLogoOk] = useState(true)

  const content = logoOk ? (
    <img
      src={LOGO_SRC}
      alt="J&J Traiteur"
      className="h-14 w-auto"
      onError={() => setLogoOk(false)}
    />
  ) : (
    <span className="font-display text-3xl text-ink">J&amp;J Traiteur</span>
  )

  return (
    <div className="flex justify-center">
      {SITE_URL ? (
        <a href={SITE_URL} aria-label="J&J Traiteur — site du traiteur">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  )
}

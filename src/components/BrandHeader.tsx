import { useState } from 'react'
import { useCatalog } from '../hooks/useCatalog'
import { telHref } from '../lib/format'

const LOGO_SRC = '/brand/jj-logo-slate.png'
const SITE_URL = import.meta.env.VITE_TRAITEUR_SITE_URL as string | undefined

// En-tête de marque, affiché sur toutes les pages publiques :
// lien vers le site vitrine, logo (repli typographique si le fichier manque)
// et téléphone cliquable.
// Le numéro vient de la source unique (secret TRAITEUR_PHONE via
// public-config) et arrive après le reste de la page : sa place est réservée
// (largeur fixe + squelette) pour que rien ne bouge à son arrivée.
export default function BrandHeader() {
  const [logoOk, setLogoOk] = useState(true)
  const { traiteurPhone, loading } = useCatalog()

  const logo = logoOk ? (
    <img
      src={LOGO_SRC}
      alt="J&J Traiteur"
      width={160}
      height={48}
      className="h-10 w-auto sm:h-12"
      onError={() => setLogoOk(false)}
    />
  ) : (
    <span className="font-display text-2xl text-slate sm:text-3xl">J&amp;J Traiteur</span>
  )

  return (
    <header className="border-b border-lin bg-fond/95">
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
        <div>
          {SITE_URL && (
            <a
              href={SITE_URL}
              className="text-sm text-slate underline-offset-4 hover:text-slate-deep hover:underline"
            >
              <span aria-hidden="true">← </span>
              <span className="hidden sm:inline">j-jtraiteur.fr</span>
              <span className="sm:hidden">Le site</span>
            </a>
          )}
        </div>

        {SITE_URL ? (
          <a href={SITE_URL} aria-label="J&J Traiteur — retour au site">
            {logo}
          </a>
        ) : (
          logo
        )}

        {/* Place réservée au téléphone : largeur fixe, quel que soit l'état. */}
        <div className="flex justify-end">
          <div className="flex h-9 w-9 items-center justify-end sm:w-44">
            {traiteurPhone ? (
              <a
                href={`tel:${telHref(traiteurPhone)}`}
                aria-label={`Appeler J&J Traiteur : ${traiteurPhone}`}
                className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-slate hover:text-slate-deep"
              >
                <PhoneIcon />
                <span className="hidden tabular-nums sm:inline">{traiteurPhone}</span>
              </a>
            ) : loading ? (
              <span className="skeleton block h-5 w-9 sm:w-40" aria-hidden="true" />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  )
}

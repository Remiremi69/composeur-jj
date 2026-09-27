import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { optionPriceLabel } from '@core/format'
import IncludedInFormule from '../components/IncludedInFormule'
import { MenuSkeleton } from '../components/Skeletons'
import MenuView from '../components/MenuView'
import PriceSummary from '../components/PriceSummary'
import { fetchDraft, type ReadOnlyMenu } from '../lib/drafts'
import { formatDate } from '../lib/format'

const SITE_URL = import.meta.env.VITE_TRAITEUR_SITE_URL as string | undefined

// Menu envoyé, en LECTURE SEULE (/menu/:token) : même rendu que le récap,
// sans bouton d'édition. Aucune donnée de contact n'y figure : la page peut
// être partagée.
export default function MenuPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<ReadOnlyMenu | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setState('invalid')
      return
    }
    fetchDraft(token).then((r) => {
      if (cancelled) return
      if (r.status === 'submitted') {
        setMenu(r.menu)
        setState('ready')
      } else if (r.status === 'draft') {
        navigate(`/reprendre/${token}`, { replace: true }) // pas encore envoyé
      } else {
        setState(r.status)
      }
    })
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  if (state === 'loading') return <MenuSkeleton />
  if (state !== 'ready' || !menu) {
    return (
      <div className="mx-auto flex w-full flex-1 max-w-md flex-col items-center justify-center px-6 text-center">
        {state === 'invalid' && <p className="mt-6 text-muted">Ce lien n’est plus valide.</p>}
        {state === 'error' && (
          <p className="mt-6 text-muted">Impossible d’afficher ce menu pour le moment. Réessayez dans un instant.</p>
        )}
        <Link to="/" className="mt-6 text-sm font-medium text-slate hover:text-slate-deep">
          Composer un menu
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mt-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-slate">Le menu de</p>
        <h1 className="mt-2 text-4xl text-slate">{menu.coupleNames}</h1>
        <p className="mt-2 text-muted">
          {menu.weddingDate && `${formatDate(menu.weddingDate)} · `}
          {menu.guestCount} convives
        </p>
        {menu.formuleName && (
          <p className="mt-3 inline-block rounded-card bg-lin-light px-4 py-1 text-sm text-slate">
            {menu.formuleName}
          </p>
        )}
      </header>

      <div className="my-8 flex items-center justify-center gap-3 text-bronze" aria-hidden="true">
        <span className="h-px w-12 bg-bronze/60" />
        <span>✦</span>
        <span className="h-px w-12 bg-bronze/60" />
      </div>

      <MenuView
        sections={menu.sections}
        options={menu.options.map((o) => ({
          name: o.name,
          priceLabel: optionPriceLabel({ price: o.price, price_unit: o.priceUnit }),
        }))}
      />

      {menu.included && menu.included.length > 0 && (
        <div className="mt-8">
          <IncludedInFormule groups={menu.included} />
        </div>
      )}

      <div className="mt-10">
        <PriceSummary estimate={menu.estimate} guestCount={menu.guestCount} formuleName={menu.formuleName} />
      </div>

      {SITE_URL && (
        <p className="mt-10 text-center">
          <a href={SITE_URL} className="text-sm font-medium text-slate hover:text-slate-deep">
            Découvrir J&amp;J Traiteur
          </a>
        </p>
      )}
    </div>
  )
}

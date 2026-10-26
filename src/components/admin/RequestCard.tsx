import type { ReactNode } from 'react'
import type { Composition } from '../../types/db'
import { formatDate, formatPhone } from '../../lib/format'
import { receivedAt, whatsappHref } from '../../lib/crm'
import { isOverdue, isWithoutMenu, receivedAgo, sourceLabel } from '../../lib/contacts'
import StatusPicker from './StatusPicker'

interface Props {
  composition: Composition
  duplicate: boolean
  now: number
  onOpen: () => void
  onSend: () => void
  onChanged: () => void
}

// Une demande sur téléphone : qui, quand, combien, et les gestes utiles en
// un tap (boutons d'au moins 44 px).
export default function RequestCard({ composition: c, duplicate, now, onOpen, onSend, onChanged }: Props) {
  const late = isOverdue(c, now)
  const draft = c.status === 'draft'
  const noMenu = draft || isWithoutMenu(c)
  const action = 'flex min-h-11 flex-1 items-center justify-center rounded-card px-3 text-base font-bold'

  return (
    <article className={`rounded-card border bg-fond p-4 ${late ? 'border-error' : 'border-lin'}`}>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-display text-xl text-slate">{c.couple_names || 'Sans prénoms'}</h3>
          <span className={`text-base ${late ? 'font-bold text-error' : 'text-muted'}`}>
            {draft ? `actif ${receivedAgo(c.updated_at, now).replace('reçu ', '')}` : receivedAgo(receivedAt(c), now)}
          </span>
        </div>
        <p className="mt-1 text-base text-ink">
          {c.wedding_date ? formatDate(c.wedding_date) : 'Date à préciser'}
          {c.guest_count ? ` · ${c.guest_count} convives` : ''}
        </p>
        <p className="mt-1 flex flex-wrap gap-2 text-base text-muted">
          {isWithoutMenu(c) && <Badge>Pas encore de menu</Badge>}
          {c.ajout_manuel && sourceLabel(c.source) && <Badge>{sourceLabel(c.source)}</Badge>}
          {duplicate && <Badge>Doublon possible</Badge>}
          {c.is_test && <Badge>test</Badge>}
          {late && <span className="font-bold text-error">À rappeler depuis plus de 48 h</span>}
        </p>
      </button>

      <div className="mt-3 flex gap-2">
        {c.phone && (
          <>
            <a href={`tel:${c.phone}`} className={`${action} bg-slate text-lin hover:bg-slate-deep`} aria-label={`Appeler ${formatPhone(c.phone)}`}>
              Appeler
            </a>
            <a href={whatsappHref(c.phone)} target="_blank" rel="noopener noreferrer" className={`${action} border border-slate text-slate`}>
              WhatsApp
            </a>
          </>
        )}
        {!c.phone && c.email && (
          <a href={`mailto:${c.email}`} className={`${action} border border-slate text-slate`}>
            Écrire
          </a>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {noMenu ? (
          <button type="button" onClick={onSend} className={`${action} border border-slate text-slate`}>
            Envoyer le configurateur
          </button>
        ) : (
          <a href={`/menu/${c.share_token}`} target="_blank" rel="noopener noreferrer" className={`${action} border border-lin text-ink`}>
            Voir le menu
          </a>
        )}
        {!draft && (
          <div className="flex-1">
            <StatusPicker composition={c} onChanged={onChanged} />
          </div>
        )}
      </div>
    </article>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-card border border-lin px-2 py-0.5 text-base text-muted">{children}</span>
}

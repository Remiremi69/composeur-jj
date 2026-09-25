import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'

export interface MenuViewSection {
  title: string
  lines: { name: string; description: string | null; supplement: number; quantity: number }[]
  editTo?: string // récap : lien « Modifier » vers l'étape concernée
}

export interface MenuViewOption {
  name: string
  priceLabel: string // « 4,50 € / pers », « Offert », « Sur demande »…
}

// Lien « Modifier » : ramène à l'étape, qui proposera ensuite de revenir
// directement au récapitulatif.
function EditLink({ to, title }: { to: string; title: string }) {
  return (
    <Link
      to={to}
      state={{ fromRecap: true }}
      aria-label={`Modifier : ${title}`}
      className="ml-2 text-xs font-medium normal-case tracking-normal text-accent underline-offset-2 hover:underline"
    >
      Modifier
    </Link>
  )
}

// Le menu, étape par étape, puis les options. Rendu commun à la page récap
// (avec les liens « Modifier ») et à la page menu en lecture seule.
export default function MenuView({
  sections,
  options,
  optionsEditTo,
}: {
  sections: MenuViewSection[]
  options: MenuViewOption[]
  optionsEditTo?: string
}) {
  return (
    <>
      <div className="flex flex-col gap-8">
        {sections.map((section, si) => (
          <section key={`${si}-${section.title}`} className="text-center">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted">
              {section.title}
              {section.editTo && <EditLink to={section.editTo} title={section.title} />}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {section.lines.map((it, li) => (
                <li key={`${li}-${it.name}`}>
                  <p className="font-display text-lg text-ink">
                    {it.name}
                    {it.quantity > 1 && <span className="text-muted"> × {it.quantity}</span>}
                    {it.supplement > 0 && (
                      <span className="text-muted"> · + {formatPrice(it.supplement)}/pers</span>
                    )}
                  </p>
                  {it.description && <p className="mx-auto max-w-md text-sm text-muted">{it.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {(options.length > 0 || optionsEditTo) && (
        <section className="mt-8 text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted">
            Vos options
            {optionsEditTo && <EditLink to={optionsEditTo} title="Vos options" />}
          </h2>
          {options.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {options.map((o, i) => (
                <li key={`${i}-${o.name}`}>
                  <p className="font-display text-lg text-ink">
                    {o.name}
                    <span className="text-muted"> · {o.priceLabel}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Aucune option choisie.</p>
          )}
        </section>
      )}
    </>
  )
}

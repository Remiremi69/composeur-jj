import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { appUrl } from '../../config/brand'
import { LINK_SOURCES, generalLink } from '../../lib/contacts'
import { copyText } from '../../lib/clipboard'

// « Mes liens » : le lien général du configurateur et une variante par
// origine (?source=…), pour savoir d'où viennent les demandes. Chaque lien a
// son QR code, fabriqué dans le navigateur et téléchargeable en PNG.
export default function LinksPage() {
  const base = appUrl()
  const links = [
    { slug: 'general', label: 'Lien général', url: generalLink(base) },
    ...LINK_SOURCES.map((s) => ({ slug: s.slug, label: s.label, url: generalLink(base, s.slug) })),
  ]
  return (
    <div className="flex flex-col gap-4 text-base">
      <div>
        <h2 className="font-display text-2xl text-slate">Mes liens</h2>
        <p className="mt-1 text-muted">
          Partagez le lien qui correspond à l’endroit où vous le donnez : les statistiques montreront d’où viennent vos demandes.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {links.map((l) => (
          <LinkCard key={l.slug} {...l} />
        ))}
      </div>
    </div>
  )
}

function LinkCard({ slug, label, url }: { slug: string; label: string; url: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#2c3640', light: '#ffffff' } })
      .then((data) => !cancelled && setQr(data))
      .catch(() => !cancelled && setQr(null))
    return () => {
      cancelled = true
    }
  }, [url])

  async function copy() {
    setCopied(await copyText(url))
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <article className="flex gap-4 rounded-card border border-lin bg-fond p-4">
      {qr ? (
        <img src={qr} alt={`QR code : ${label}`} width={112} height={112} className="h-28 w-28 shrink-0 rounded-card border border-lin" />
      ) : (
        <div className="h-28 w-28 shrink-0 rounded-card bg-lin-light" aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="font-bold text-ink">{label}</h3>
        <p className="break-all text-muted">{url.replace(/^https?:\/\//, '')}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="min-h-11 rounded-card bg-slate px-4 font-bold text-lin" aria-live="polite">
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
          {qr && (
            <a href={qr} download={`qr-jj-traiteur-${slug}.png`} className="flex min-h-11 items-center rounded-card border border-slate px-4 font-bold text-slate">
              QR code (PNG)
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

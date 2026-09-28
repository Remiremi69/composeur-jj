// Gabarit HTML commun à tous les emails (soumission, relance) : logo,
// couleurs de J&J, bouton d'action, pied de page avec les coordonnées.
// Mise en page en tableaux et styles en ligne : c'est ce que les messageries
// (Gmail, Outlook, Apple Mail) affichent de façon fiable.
// RÈGLE : toute valeur dynamique passe par escapeHtml().

import { BRAND, COLORS, logoUrl, type BrandContact } from './brand.ts'
import { telHref } from './core/format.ts'
import { escapeHtml } from './html.ts'

export const EMAIL_FONT = "Lato, 'Helvetica Neue', Arial, sans-serif"
export const EMAIL_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif"

export interface EmailLayoutInput {
  brand: BrandContact
  preheader?: string // aperçu affiché par la messagerie à côté du sujet
  title: string // titre principal (texte brut, échappé ici)
  bodyHtml: string // contenu, déjà échappé par l'appelant
  cta?: { label: string; url: string } | null
  footerNoteHtml?: string // ex. lien de désinscription (déjà échappé)
}

// Bouton d'action : ardoise, texte lin (5,6:1), rayon sobre.
export function emailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto">
  <tr><td style="background:${COLORS.slate};border-radius:4px">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 30px;font-family:${EMAIL_FONT};font-size:15px;font-weight:bold;color:${COLORS.lin};text-decoration:none;border-radius:4px">${escapeHtml(label)}</a>
  </td></tr>
</table>`
}

export function emailLayout(input: EmailLayoutInput): string {
  const { brand } = input
  const logo = logoUrl(brand)
  const header = logo
    ? `<img src="${escapeHtml(logo)}" alt="J&amp;J Traiteur" width="96" height="96" style="display:block;margin:0 auto;border:0;width:96px;height:96px">`
    : `<p style="margin:0;font-family:${EMAIL_SERIF};font-size:24px;color:${COLORS.slate}">J&amp;J Traiteur</p>`

  const contact = [
    brand.phone
      ? `<a href="tel:${escapeHtml(telHref(brand.phone))}" style="color:${COLORS.slate};text-decoration:none;font-weight:bold">${escapeHtml(brand.phone)}</a>`
      : null,
    brand.email
      ? `<a href="mailto:${escapeHtml(brand.email)}" style="color:${COLORS.slate};text-decoration:none">${escapeHtml(brand.email)}</a>`
      : null,
    `<a href="${BRAND.siteUrl}" style="color:${COLORS.slate};text-decoration:none">${BRAND.siteLabel}</a>`,
  ]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.linLight}">
${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.linLight}">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
      <tr><td align="center" style="padding:0 0 20px">${header}</td></tr>
      <tr><td style="background:${COLORS.fond};border:1px solid ${COLORS.lin};border-top:3px solid ${COLORS.bronze};border-radius:4px;padding:32px 28px;font-family:${EMAIL_FONT};color:${COLORS.ink};font-size:15px;line-height:1.6">
        <h1 style="margin:0 0 16px;font-family:${EMAIL_SERIF};font-size:26px;font-weight:normal;line-height:1.25;color:${COLORS.slate}">${escapeHtml(input.title)}</h1>
        ${input.bodyHtml}
        ${input.cta ? emailButton(input.cta.label, input.cta.url) : ''}
      </td></tr>
      <tr><td align="center" style="padding:22px 12px 0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.7;color:${COLORS.slate}">
        <p style="margin:0;font-weight:bold">${BRAND.name}</p>
        <p style="margin:0">${contact}</p>
        <p style="margin:6px 0 0;font-size:12px">SIRET ${BRAND.siret}</p>
        ${input.footerNoteHtml ? `<p style="margin:14px 0 0;font-size:12px">${input.footerNoteHtml}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

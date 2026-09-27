// Emails de soumission : notification au traiteur + récapitulatif au couple.
// RÈGLE : toute valeur dynamique passe par escapeHtml().
// Hiérarchie des prix (identique au site et au PDF) : prix par personne en
// avant, total en dessous, plus discret.

import { COLORS, NO_CONTACT, type BrandContact } from '../_shared/brand.ts'
import { optionPriceLabel } from '../_shared/core/format.ts'
import { EMAIL_SERIF, emailLayout } from '../_shared/email-layout.ts'
import { escapeHtml, singleLine } from '../_shared/html.ts'
import { eur, formatDate, formatPhone, type RecapData } from '../_shared/recap.ts'

// Couleurs de la charte (cf. _shared/brand.ts) : ardoise pour les titres et
// libellés, encre pour le texte, lin pour les bordures et fonds.
const MUTED = COLORS.slate
const INK = COLORS.ink
const LINE = COLORS.lin

export interface EmailContext {
  brand: BrandContact
  menuUrl?: string | null // lien /menu/:token (bouton du couple)
}
const NO_CONTEXT: EmailContext = { brand: NO_CONTACT }

// Texte libre saisi par le couple : échappé, retours à la ligne conservés.
function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function menuHtml(recap: RecapData): string {
  let html = ''
  for (const section of recap.sections) {
    html += `<p style="margin:14px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${MUTED}">${escapeHtml(section.title)}</p>`
    for (const it of section.lines) {
      const qty = it.quantity > 1 ? ` ×${it.quantity}` : ''
      const sup = it.supplement > 0 ? ` (+ ${escapeHtml(eur(it.supplement))}/pers)` : ''
      html += `<p style="margin:0;font-size:15px;color:${INK}">${escapeHtml(it.name)}${qty}${sup}</p>`
    }
  }
  if (recap.options.length) {
    html += `<p style="margin:14px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${MUTED}">Options</p>`
    for (const o of recap.options) {
      const label = optionPriceLabel({ price: o.price, price_unit: o.priceUnit })
      html += `<p style="margin:0;font-size:15px;color:${INK}">${escapeHtml(o.name)} (${escapeHtml(label)})</p>`
    }
  }
  return html
}

// « Déjà compris dans votre formule » : étapes où il n'y a rien à choisir.
function includedHtml(recap: RecapData): string {
  if (recap.included.length === 0) return ''
  let html = `<div style="margin-top:20px;padding:14px 16px;background:${COLORS.linLight};border-left:3px solid ${COLORS.bronze};border-radius:4px">
    <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:${INK}">Déjà compris dans votre formule</p>`
  for (const group of recap.included) {
    html += `<p style="margin:10px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${MUTED}">${escapeHtml(group.title)}</p>`
    for (const it of group.items) {
      html += `<p style="margin:0;font-size:14px;color:${INK}">✓ ${escapeHtml(it.name)}</p>`
    }
  }
  return `${html}</div>`
}

// Prix par personne en avant, total en dessous (plus discret).
export function priceHtml(recap: RecapData): string {
  const { estimate } = recap
  const forfait =
    estimate.forfaitOptions > 0
      ? `, dont ${escapeHtml(eur(estimate.forfaitOptions))} d’options au forfait`
      : ''
  return `
    <div style="margin-top:22px;padding:16px;border:1px solid ${LINE};border-radius:4px;text-align:center">
      <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${MUTED}">Estimation</p>
      <p style="margin:6px 0 0;font-family:${EMAIL_SERIF};font-size:26px;color:${COLORS.slate}"><strong>${escapeHtml(eur(estimate.perPersonAllIn))}</strong>
        <span style="font-size:14px;color:${MUTED}">par personne, tout compris</span></p>
      <p style="margin:8px 0 0;font-size:13px;color:${MUTED}">Soit ${escapeHtml(eur(estimate.total))} au total pour ${escapeHtml(recap.guestCount)} convives${forfait}.</p>
    </div>`
}

function row(label: string, valueHtml: string): string {
  return `<tr><td style="color:${MUTED};padding-right:16px;vertical-align:top">${label}</td><td>${valueHtml}</td></tr>`
}

function contactRows(recap: RecapData, withEmail: boolean): string {
  const c = recap.contact
  if (!c) return ''
  const tel = escapeHtml(c.phone)
  let rows = row('Téléphone', `<a href="tel:${tel}">${escapeHtml(formatPhone(c.phone))}</a>`)
  if (withEmail) rows += row('Email', `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>`)
  rows += row('Lieu de réception', escapeHtml(c.venue))
  rows += row('Allergies et régimes', c.dietaryNotes ? multiline(c.dietaryNotes) : '—')
  if (c.message) rows += row('Message', multiline(c.message))
  return rows
}

const h2 = (text: string) =>
  `<h2 style="font-family:${EMAIL_SERIF};font-size:19px;font-weight:normal;color:${COLORS.slate};margin:26px 0 4px">${text}</h2>`

export function traiteurEmail(
  recap: RecapData,
  source: string | null = null,
  ctx: EmailContext = NO_CONTEXT,
): { subject: string; html: string } {
  const date = formatDate(recap.weddingDate) || '—'
  const body = `
      <table style="font-size:14px;line-height:1.7;border-collapse:collapse">
        ${row('Couple', `<strong>${escapeHtml(recap.coupleNames)}</strong>`)}
        ${row('Date du mariage', escapeHtml(date))}
        ${row('Nombre de convives', escapeHtml(recap.guestCount))}
        ${row('Formule', escapeHtml(recap.formuleName))}
        ${contactRows(recap, true)}
        ${source ? row('Provenance', escapeHtml(source)) : ''}
      </table>
      ${priceHtml(recap)}
      ${h2('Le menu')}
      ${menuHtml(recap)}
      ${includedHtml(recap)}
      <p style="margin-top:22px;font-size:13px;color:${MUTED}">Répondez directement à cet email pour écrire aux mariés. Le récapitulatif complet est en pièce jointe (PDF).</p>`
  const html = emailLayout({
    brand: ctx.brand,
    title: 'Nouvelle demande de menu',
    preheader: `${recap.coupleNames} — ${recap.guestCount} convives, formule ${recap.formuleName}`,
    bodyHtml: body,
  })
  return { subject: singleLine(`Nouvelle demande de menu — ${recap.coupleNames}`), html }
}

export function coupleEmail(recap: RecapData, ctx: EmailContext = NO_CONTEXT): { subject: string; html: string } {
  const date = formatDate(recap.weddingDate)
  const quand = date ? `pour le ${escapeHtml(date)} ` : ''
  const body = `
      <p style="margin:0">Voici le récapitulatif de votre menu ${quand}(${escapeHtml(recap.guestCount)} convives, formule ${escapeHtml(recap.formuleName)}).
      Cette estimation est indicative : votre traiteur J&amp;J reviendra vers vous pour confirmer le devis.</p>
      ${h2('Votre menu')}
      ${menuHtml(recap)}
      ${includedHtml(recap)}
      ${priceHtml(recap)}
      ${
        recap.contact
          ? `${h2('Vos informations')}
      <table style="font-size:14px;line-height:1.7;border-collapse:collapse">${contactRows(recap, false)}</table>`
          : ''
      }
      <p style="margin-top:18px;font-size:13px;color:${MUTED}">Le récapitulatif est aussi en pièce jointe (PDF). Une question ? Répondez simplement à cet email.</p>`
  const html = emailLayout({
    brand: ctx.brand,
    title: `Merci ${recap.coupleNames} !`,
    preheader: 'Le récapitulatif de votre menu de mariage',
    bodyHtml: body,
    cta: ctx.menuUrl ? { label: 'Voir mon menu en ligne', url: ctx.menuUrl } : null,
  })
  return { subject: singleLine(`Votre menu de mariage — ${recap.coupleNames}`), html }
}

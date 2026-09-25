// Emails de soumission : notification au traiteur + récapitulatif au couple.
// RÈGLE : toute valeur dynamique passe par escapeHtml().
// Hiérarchie des prix (identique au site et au PDF) : prix par personne en
// avant, total en dessous, plus discret.

import { optionPriceLabel } from '../_shared/core/format.ts'
import { escapeHtml, singleLine } from '../_shared/html.ts'
import { eur, formatDate, formatPhone, type RecapData } from '../_shared/recap.ts'

const MUTED = '#8a7f74'
const INK = '#2b2521'
const ACCENT = '#8c6a3f'
const LINE = '#e8ded0'

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

// Prix par personne en avant, total en dessous (plus discret).
export function priceHtml(recap: RecapData): string {
  const { estimate } = recap
  const forfait =
    estimate.forfaitOptions > 0
      ? `, dont ${escapeHtml(eur(estimate.forfaitOptions))} d’options au forfait`
      : ''
  return `
    <div style="margin-top:22px;padding:16px;border:1px solid ${LINE};border-radius:12px;text-align:center">
      <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${MUTED}">Estimation</p>
      <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:26px;color:${INK}"><strong>${escapeHtml(eur(estimate.perPersonAllIn))}</strong>
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

export function traiteurEmail(recap: RecapData, source: string | null = null): { subject: string; html: string } {
  const date = formatDate(recap.weddingDate) || '—'
  const html = `
    <div style="font-family:Arial,sans-serif;color:${INK};max-width:560px;margin:auto">
      <p style="text-transform:uppercase;letter-spacing:2px;color:${ACCENT};font-size:13px">Le Composeur — J&amp;J Traiteur</p>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:4px 0 16px">Nouvelle demande de menu</h1>
      <table style="font-size:14px;line-height:1.7;border-collapse:collapse">
        ${row('Couple', `<strong>${escapeHtml(recap.coupleNames)}</strong>`)}
        ${row('Date du mariage', escapeHtml(date))}
        ${row('Nombre de convives', escapeHtml(recap.guestCount))}
        ${row('Formule', escapeHtml(recap.formuleName))}
        ${contactRows(recap, true)}
        ${source ? row('Provenance', escapeHtml(source)) : ''}
      </table>
      ${priceHtml(recap)}
      <h2 style="font-family:Georgia,serif;font-size:18px;margin:22px 0 4px">Le menu</h2>
      ${menuHtml(recap)}
      <p style="margin-top:22px;font-size:13px;color:${MUTED}">Répondez directement à cet email pour écrire aux mariés. Le récapitulatif complet est en pièce jointe (PDF).</p>
    </div>`
  return { subject: singleLine(`Nouvelle demande de menu — ${recap.coupleNames}`), html }
}

export function coupleEmail(recap: RecapData): { subject: string; html: string } {
  const date = formatDate(recap.weddingDate)
  const quand = date ? `pour le ${escapeHtml(date)} ` : ''
  const html = `
    <div style="font-family:Arial,sans-serif;color:${INK};max-width:560px;margin:auto">
      <p style="text-transform:uppercase;letter-spacing:2px;color:${ACCENT};font-size:13px">J&amp;J Traiteur</p>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:4px 0 12px">Merci ${escapeHtml(recap.coupleNames)} !</h1>
      <p style="font-size:14px;line-height:1.6">Voici le récapitulatif de votre menu ${quand}(${escapeHtml(recap.guestCount)} convives, formule ${escapeHtml(recap.formuleName)}).
      Cette estimation est indicative : votre traiteur J&amp;J reviendra vers vous pour confirmer le devis.</p>
      <h2 style="font-family:Georgia,serif;font-size:18px;margin:22px 0 4px">Votre menu</h2>
      ${menuHtml(recap)}
      ${priceHtml(recap)}
      ${
        recap.contact
          ? `<h2 style="font-family:Georgia,serif;font-size:18px;margin:22px 0 4px">Vos informations</h2>
      <table style="font-size:14px;line-height:1.7;border-collapse:collapse">${contactRows(recap, false)}</table>`
          : ''
      }
      <p style="margin-top:14px;font-size:13px;color:${MUTED}">Le récapitulatif est aussi en pièce jointe (PDF). Une question ? Répondez simplement à cet email.</p>
    </div>`
  return { subject: singleLine(`Votre menu de mariage — ${recap.coupleNames}`), html }
}

// Emails (Resend) : notification au traiteur + récapitulatif au couple.
// RÈGLE : toute valeur dynamique passe par escapeHtml().

import { escapeHtml, singleLine } from '../_shared/html.ts'
import { eur, formatDate, type RecapData } from './recap.ts'

const MUTED = '#8a7f74'
const INK = '#2b2521'
const ACCENT = '#8c6a3f'

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
      const p = o.priceUnit === 'par_personne' ? `${eur(o.price)}/pers` : `${eur(o.price)} forfait`
      html += `<p style="margin:0;font-size:15px;color:${INK}">${escapeHtml(o.name)} (${escapeHtml(p)})</p>`
    }
  }
  return html
}

function estimateRows(recap: RecapData): string {
  const { estimate } = recap
  let rows = `<tr><td style="color:${MUTED};padding-right:16px">Prix par personne</td><td><strong>${escapeHtml(eur(estimate.perPersonAllIn))}</strong> (tout compris)</td></tr>`
  if (estimate.forfaitOptions > 0) {
    rows += `<tr><td style="color:${MUTED};padding-right:16px">Options au forfait</td><td>${escapeHtml(eur(estimate.forfaitOptions))}</td></tr>`
  }
  rows += `<tr><td style="color:${MUTED};padding-right:16px">Estimation totale</td><td><strong>${escapeHtml(eur(estimate.total))}</strong></td></tr>`
  return rows
}

export function traiteurEmail(recap: RecapData): { subject: string; html: string } {
  const date = formatDate(recap.weddingDate) || '—'
  const html = `
    <div style="font-family:Arial,sans-serif;color:${INK};max-width:560px;margin:auto">
      <p style="text-transform:uppercase;letter-spacing:2px;color:${ACCENT};font-size:13px">Le Composeur — J&amp;J Traiteur</p>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:4px 0 16px">Nouvelle demande de menu</h1>
      <table style="font-size:14px;line-height:1.7;border-collapse:collapse">
        <tr><td style="color:${MUTED};padding-right:16px">Couple</td><td><strong>${escapeHtml(recap.coupleNames)}</strong></td></tr>
        <tr><td style="color:${MUTED};padding-right:16px">Date du mariage</td><td>${escapeHtml(date)}</td></tr>
        <tr><td style="color:${MUTED};padding-right:16px">Nombre de convives</td><td>${escapeHtml(recap.guestCount)}</td></tr>
        <tr><td style="color:${MUTED};padding-right:16px">Email des mariés</td><td><a href="mailto:${escapeHtml(recap.email)}">${escapeHtml(recap.email)}</a></td></tr>
        <tr><td style="color:${MUTED};padding-right:16px">Formule</td><td>${escapeHtml(recap.formuleName)}</td></tr>
        ${estimateRows(recap)}
      </table>
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
      <table style="margin-top:18px;font-size:14px;line-height:1.7;border-collapse:collapse">
        ${estimateRows(recap)}
      </table>
      <p style="margin-top:14px;font-size:13px;color:${MUTED}">Le récapitulatif est aussi en pièce jointe (PDF). Une question ? Répondez simplement à cet email.</p>
    </div>`
  return { subject: singleLine(`Votre menu de mariage — ${recap.coupleNames}`), html }
}

export interface SendEmailInput {
  apiKey: string
  from: string
  to: string | string[]
  replyTo?: string
  subject: string
  html: string
  pdfBase64: string | null
}

// Envoie un email via Resend. Renvoie true si Resend l'a accepté.
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const body: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  }
  if (input.replyTo) body.reply_to = input.replyTo
  if (input.pdfBase64) {
    body.attachments = [{ filename: 'menu-de-mariage.pdf', content: input.pdfBase64 }]
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`[emails] Resend a refusé l'envoi (${res.status}) : ${await res.text()}`)
    return false
  }
  return true
}

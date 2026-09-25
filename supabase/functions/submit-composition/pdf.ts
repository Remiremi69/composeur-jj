// Génération du PDF récapitulatif (pdf-lib, polices standard).
// Hiérarchie des prix identique au site et aux emails : prix par personne
// en avant, total en dessous, plus discret.

import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { optionPriceLabel } from '../_shared/core/format.ts'
import { eur, formatDate, formatPhone, type RecapData } from '../_shared/recap.ts'

// Les polices standard (WinAnsi) n'encodent qu'un jeu de caractères limité :
// on normalise la typographie et on remplace tout caractère non encodable
// (emoji, alphabets non latins…) pour que le PDF ne plante jamais.
function clean(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    // Espaces spéciaux, dont U+202F utilisé par le format € français.
    .replace(/[    ⁠\t\r\n]/g, ' ')
    .replace(/[^\x20-\x7E¡-ÿ€œŒ]/g, '?')
}

export async function buildPdf(recap: RecapData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sans = await doc.embedFont(StandardFonts.Helvetica)

  const ink = rgb(0.17, 0.145, 0.129)
  const muted = rgb(0.54, 0.5, 0.45)
  const accent = rgb(0.55, 0.42, 0.25)
  const line = rgb(0.91, 0.87, 0.81)

  const W = 595
  const H = 842
  const margin = 64
  const maxW = W - margin * 2

  let page = doc.addPage([W, H])
  let y = H - margin

  function ensure(space: number) {
    if (y - space < margin) {
      page = doc.addPage([W, H])
      y = H - margin
    }
  }
  function center(text: string, font: typeof serif, size: number, color = ink) {
    const t = clean(text)
    const w = font.widthOfTextAtSize(t, size)
    page.drawText(t, { x: (W - w) / 2, y, size, font, color })
  }
  function wrap(text: string, font: typeof serif, size: number): string[] {
    const words = clean(text).split(/\s+/)
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxW && current) {
        lines.push(current)
        current = word
      } else current = test
    }
    if (current) lines.push(current)
    return lines
  }
  function separator() {
    ensure(30)
    y -= 6
    page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: line })
    y -= 24
  }

  ensure(26)
  center('VOTRE MENU', sans, 11, accent)
  y -= 34
  for (const l of wrap(recap.coupleNames, serifBold, 28)) {
    ensure(30)
    center(l, serifBold, 28)
    y -= 30
  }
  y += 8
  const sub = [formatDate(recap.weddingDate), `${recap.guestCount} convives`, recap.formuleName]
    .filter(Boolean)
    .join('  ·  ')
  center(sub, sans, 12, muted)
  y -= 34

  for (const section of recap.sections) {
    ensure(28)
    center(section.title.toUpperCase(), sans, 10, muted)
    y -= 20
    for (const it of section.lines) {
      const qty = it.quantity > 1 ? ` x${it.quantity}` : ''
      const suffix = it.supplement > 0 ? ` (+ ${eur(it.supplement)}/pers)` : ''
      ensure(20)
      center(`${it.name}${qty}${suffix}`, serif, 15, ink)
      y -= 18
      if (it.description) {
        for (const l of wrap(it.description, sans, 10)) {
          ensure(14)
          center(l, sans, 10, muted)
          y -= 13
        }
      }
      y -= 8
    }
    y -= 12
  }

  if (recap.options.length) {
    ensure(28)
    center('OPTIONS', sans, 10, muted)
    y -= 20
    for (const o of recap.options) {
      const label = optionPriceLabel({ price: o.price, price_unit: o.priceUnit })
      ensure(20)
      center(`${o.name} (${label})`, serif, 15, ink)
      y -= 22
    }
    y -= 8
  }

  // Déjà compris dans la formule (étapes sans choix).
  if (recap.included.length) {
    ensure(28)
    center('DÉJÀ COMPRIS DANS VOTRE FORMULE', sans, 10, muted)
    y -= 20
    for (const group of recap.included) {
      ensure(18)
      center(group.title, sans, 9, muted)
      y -= 15
      for (const it of group.items) {
        ensure(16)
        center(it.name, serif, 13, ink)
        y -= 16
      }
      y -= 6
    }
    y -= 8
  }

  // Estimation : prix par personne en avant, total en dessous.
  const { estimate } = recap
  separator()
  ensure(80)
  center('ESTIMATION', sans, 10, muted)
  y -= 28
  center(`${eur(estimate.perPersonAllIn)} par personne`, serifBold, 22, ink)
  y -= 16
  center('tout compris', sans, 10, muted)
  y -= 20
  const forfait = estimate.forfaitOptions > 0 ? `, dont ${eur(estimate.forfaitOptions)} d'options au forfait` : ''
  center(`Soit ${eur(estimate.total)} au total pour ${recap.guestCount} convives${forfait}`, sans, 10, muted)
  y -= 18
  center('Estimation indicative - votre traiteur J&J vous confirmera le devis définitif.', sans, 9, muted)
  y -= 10

  // Informations de recontact
  const c = recap.contact
  if (c) {
    separator()
    ensure(28)
    center('VOS INFORMATIONS', sans, 10, muted)
    y -= 20
    const rows: [string, string][] = [
      ['Téléphone', formatPhone(c.phone)],
      ['Lieu de réception', c.venue],
      ['Allergies et régimes', c.dietaryNotes || '-'],
    ]
    if (c.message) rows.push(['Message', c.message])
    for (const [label, value] of rows) {
      ensure(20)
      center(label, sans, 9, muted)
      y -= 14
      for (const l of wrap(value, sans, 11)) {
        ensure(15)
        center(l, sans, 11, ink)
        y -= 14
      }
      y -= 6
    }
  }

  return await doc.save()
}

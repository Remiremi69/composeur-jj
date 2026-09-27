// Génération du PDF récapitulatif (pdf-lib, polices standard), aux couleurs
// de J&J : logo en en-tête, ardoise et bronze, pied de page avec les
// coordonnées. Hiérarchie des prix identique au site et aux emails : prix par
// personne en avant, total en dessous, plus discret.
//
// Deux usages :
// • PDF joint aux emails (includeContact: true) : avec « Vos informations » ;
// • PDF partageable (menu-pdf, includeContact: false) : JAMAIS de téléphone,
//   lieu, allergies ni message — le lien du menu peut circuler.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'https://esm.sh/pdf-lib@1.17.1'
import { LOGO_PNG_BASE64 } from './brand-logo.ts'
import { BRAND, COLORS, type BrandContact } from './brand.ts'
import { optionPriceLabel } from './core/format.ts'
import { eur, formatDate, formatPhone, type RecapData } from './recap.ts'

// Les polices standard encodent en WinAnsi (Windows-1252) : tous les accents
// français, ainsi que ’ “ ” … – — € œ, y sont. On ne remplace que le reste :
// espaces spéciaux (dont U+202F du format € français) par une espace, et les
// caractères hors WinAnsi (emoji, autres alphabets) par « ? ».
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
export function clean(s: string | null | undefined): string {
  return Array.from(
    (s ?? '').replace(/[     ⁠\t\r\n]/g, ' '),
    (ch) => {
      const code = ch.codePointAt(0) ?? 0
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff)) return ch
      return WIN_ANSI_EXTRA.includes(ch) ? ch : '?'
    },
  ).join('')
}

function hex(color: string) {
  const n = parseInt(color.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

export interface PdfOptions {
  includeContact: boolean
  brand: BrandContact
}

export async function buildPdf(recap: RecapData, options: PdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(clean(`Menu de mariage — ${recap.coupleNames}`))
  doc.setAuthor(BRAND.name)
  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sans = await doc.embedFont(StandardFonts.Helvetica)
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const ink = hex(COLORS.ink)
  const slate = hex(COLORS.slate)
  const bronze = hex(COLORS.bronze)
  const lin = hex(COLORS.lin)

  const W = 595
  const H = 842
  const margin = 64
  const footerSpace = 56 // réservé au pied de page
  const maxW = W - margin * 2

  let page: PDFPage = doc.addPage([W, H])
  let y = H - margin

  function ensure(space: number) {
    if (y - space < margin + footerSpace) {
      page = doc.addPage([W, H])
      y = H - margin
    }
  }
  function center(text: string, font: PDFFont, size: number, color = ink) {
    const t = clean(text)
    const w = font.widthOfTextAtSize(t, size)
    page.drawText(t, { x: (W - w) / 2, y, size, font, color })
  }
  function wrap(text: string, font: PDFFont, size: number): string[] {
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
  // Filet bronze court, centré (décor).
  function filet(width = 60) {
    page.drawLine({
      start: { x: (W - width) / 2, y },
      end: { x: (W + width) / 2, y },
      thickness: 0.8,
      color: bronze,
    })
  }
  function separator() {
    ensure(30)
    y -= 6
    page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: lin })
    y -= 24
  }
  function sectionTitle(text: string) {
    ensure(34)
    center(text.toUpperCase(), sansBold, 9.5, slate)
    y -= 8
    filet(28)
    y -= 16
  }

  // En-tête : logo (intégré au code) ou nom en texte.
  if (LOGO_PNG_BASE64) {
    const logo = await doc.embedPng(LOGO_PNG_BASE64)
    const scaled = logo.scaleToFit(180, 56)
    page.drawImage(logo, { x: (W - scaled.width) / 2, y: y - scaled.height, width: scaled.width, height: scaled.height })
    y -= scaled.height + 26
  } else {
    y -= 18
    center(BRAND.name, serifBold, 24, slate)
    y -= 26
  }
  filet(90)
  y -= 30

  center('VOTRE MENU DE MARIAGE', sansBold, 10, slate)
  y -= 32
  for (const l of wrap(recap.coupleNames, serifBold, 28)) {
    ensure(30)
    center(l, serifBold, 28, slate)
    y -= 30
  }
  y += 8
  const sub = [formatDate(recap.weddingDate), `${recap.guestCount} convives`, recap.formuleName]
    .filter(Boolean)
    .join('  ·  ')
  center(sub, sans, 12, slate)
  y -= 36

  for (const section of recap.sections) {
    sectionTitle(section.title)
    for (const it of section.lines) {
      const qty = it.quantity > 1 ? ` × ${it.quantity}` : ''
      const suffix = it.supplement > 0 ? ` (+ ${eur(it.supplement)}/pers)` : ''
      ensure(20)
      center(`${it.name}${qty}${suffix}`, serif, 15, ink)
      y -= 18
      if (it.description) {
        for (const l of wrap(it.description, sans, 10)) {
          ensure(14)
          center(l, sans, 10, slate)
          y -= 13
        }
      }
      y -= 8
    }
    y -= 12
  }

  if (recap.options.length) {
    sectionTitle('Options')
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
    sectionTitle('Déjà compris dans votre formule')
    for (const group of recap.included) {
      ensure(18)
      center(group.title, sans, 9, slate)
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
  ensure(90)
  center('ESTIMATION', sansBold, 9.5, slate)
  y -= 28
  center(`${eur(estimate.perPersonAllIn)} par personne`, serifBold, 22, slate)
  y -= 16
  center('tout compris', sans, 10, slate)
  y -= 20
  const forfait = estimate.forfaitOptions > 0 ? `, dont ${eur(estimate.forfaitOptions)} d’options au forfait` : ''
  center(`Soit ${eur(estimate.total)} au total pour ${recap.guestCount} convives${forfait}`, sans, 10, slate)
  y -= 18
  center('Estimation indicative — votre traiteur J&J vous confirmera le devis définitif.', sans, 9, slate)
  y -= 10

  // Informations de recontact : uniquement dans le PDF joint aux emails.
  const c = recap.contact
  if (options.includeContact && c) {
    separator()
    sectionTitle('Vos informations')
    const rows: [string, string][] = [
      ['Téléphone', formatPhone(c.phone)],
      ['Lieu de réception', c.venue],
      ['Allergies et régimes', c.dietaryNotes || '—'],
    ]
    if (c.message) rows.push(['Message', c.message])
    for (const [label, value] of rows) {
      ensure(20)
      center(label, sans, 9, slate)
      y -= 14
      for (const l of wrap(value, sans, 11)) {
        ensure(15)
        center(l, sans, 11, ink)
        y -= 14
      }
      y -= 6
    }
  }

  // Pied de page sur chaque page : coordonnées de J&J et SIRET.
  const contactLine = [
    options.brand.phone ? `Tél. ${options.brand.phone}` : null,
    options.brand.email,
    BRAND.siteLabel,
  ]
    .filter(Boolean)
    .join('  ·  ')
  const legal = `${BRAND.name} — SIRET ${BRAND.siret}`
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: margin, y: 52 }, end: { x: W - margin, y: 52 }, thickness: 0.5, color: lin })
    for (const [text, font, size, yy] of [
      [contactLine, sansBold, 8.5, 38],
      [legal, sans, 8, 26],
    ] as const) {
      const t = clean(text)
      p.drawText(t, { x: (W - font.widthOfTextAtSize(t, size)) / 2, y: yy, size, font, color: slate })
    }
    if (pages.length > 1) {
      const n = `${i + 1} / ${pages.length}`
      p.drawText(n, { x: W - margin - sans.widthOfTextAtSize(n, 8), y: 26, size: 8, font: sans, color: slate })
    }
  })

  return await doc.save()
}

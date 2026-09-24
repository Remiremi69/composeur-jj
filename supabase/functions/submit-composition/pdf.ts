// Génération du PDF récapitulatif (pdf-lib, polices standard).

import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { eur, formatDate, type RecapData } from './recap.ts'

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
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line)
        line = word
      } else line = test
    }
    if (line) lines.push(line)
    return lines
  }

  ensure(26)
  center('VOTRE MENU', sans, 11, accent)
  y -= 34
  for (const line of wrap(recap.coupleNames, serifBold, 28)) {
    ensure(30)
    center(line, serifBold, 28)
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
        for (const line of wrap(it.description, sans, 10)) {
          ensure(14)
          center(line, sans, 10, muted)
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
      const p = o.priceUnit === 'par_personne' ? `${eur(o.price)}/pers` : `${eur(o.price)} forfait`
      ensure(20)
      center(`${o.name} (${p})`, serif, 15, ink)
      y -= 22
    }
    y -= 8
  }

  const { estimate } = recap
  ensure(100)
  y -= 6
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: rgb(0.91, 0.87, 0.81),
  })
  y -= 24
  center(
    `${eur(estimate.perPersonAllIn)} par personne (tout compris) x ${recap.guestCount} convives`,
    sans,
    11,
    muted,
  )
  y -= 18
  if (estimate.forfaitOptions > 0) {
    center(`+ options au forfait : ${eur(estimate.forfaitOptions)}`, sans, 11, muted)
    y -= 18
  }
  y -= 8
  center(eur(estimate.total), serifBold, 22, ink)
  y -= 24
  center('Estimation indicative - votre traiteur J&J vous confirmera le devis définitif.', sans, 9, muted)

  return await doc.save()
}

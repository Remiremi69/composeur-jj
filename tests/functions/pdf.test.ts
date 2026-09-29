// PDF : le PDF partageable (menu-pdf) ne contient AUCUNE coordonnée ; le PDF
// joint aux emails reste complet. Les vrais fichiers sont générés (pdf-lib)
// puis leur texte est relu.
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildSharedMenuPdf } from '../../supabase/functions/menu-pdf/build.ts'
import { buildPdf, clean } from '../../supabase/functions/_shared/pdf.ts'
import type { RecapData } from '../../supabase/functions/_shared/recap.ts'

const brand = { phone: '+33 6 71 17 06 73', email: 'contact@exemple.fr', appUrl: 'https://composer.exemple.fr' }

const recap: RecapData = {
  coupleNames: 'Camille & Aurélien',
  weddingDate: '2027-06-19',
  guestCount: 100,
  formuleName: 'Signature',
  sections: [
    {
      title: 'Votre plat',
      lines: [{ name: 'Poulet fermier, sauce aux morilles', description: 'Écrasé de pommes de terre', supplement: 3, quantity: 1 }],
    },
  ],
  options: [{ name: 'Bar de nuit', price: 250, priceUnit: 'forfait' }],
  included: [{ title: 'Vos boissons', items: [{ name: 'Citronnade maison', description: null }] }],
  estimate: {
    basePerPerson: 130,
    supplementsPerPerson: 3,
    optionsPerPerson: 0,
    forfaitOptions: 250,
    perPersonAllIn: 135.5,
    total: 13550,
  },
  contact: {
    email: 'couple@exemple.fr',
    phone: '+33612345678',
    venue: 'Domaine des Tilleuls',
    dietaryNotes: 'Trois végétariens',
    message: 'Message secret du couple',
  },
}

// Texte d'un PDF pdf-lib : flux compressés (FlateDecode) contenant des
// chaînes hexadécimales encodées en WinAnsi (<48656C6C6F> Tj).
function pdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString('latin1')
  const texts: string[] = []
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  for (const m of raw.matchAll(streamRe)) {
    let content: string
    try {
      content = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
    } catch {
      content = m[1]
    }
    for (const t of content.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)) {
      texts.push(Buffer.from(t[1], 'hex').toString('latin1'))
    }
  }
  return texts.join('\n')
}

// Tout ce qui ne doit jamais apparaître dans le PDF partageable.
const contactTexts = ['+33 6 12 34 56 78', 'Domaine des Tilleuls', 'Trois végétariens', 'Message secret du couple', 'Vos informations', 'VOS INFORMATIONS', 'couple@exemple.fr']

describe('PDF', () => {
  it('menu-pdf : aucune coordonnée (téléphone, lieu, allergies, message)', async () => {
    const text = pdfText(await buildSharedMenuPdf(recap, brand))
    expect(text).toContain('Poulet fermier') // le menu est bien là
    expect(text).toContain('DÉJÀ COMPRIS DANS VOTRE FORMULE')
    for (const secret of contactTexts) expect(text).not.toContain(secret)
  })

  it('PDF joint aux emails : complet, avec « Vos informations »', async () => {
    const text = pdfText(await buildPdf(recap, { includeContact: true, brand }))
    expect(text).toContain('VOS INFORMATIONS')
    expect(text).toContain('+33 6 12 34 56 78')
    expect(text).toContain('Domaine des Tilleuls')
    expect(text).toContain('Trois végétariens')
    expect(text).toContain('Message secret du couple')
  })

  it('accents conservés, pied de page avec coordonnées et SIRET', async () => {
    const text = pdfText(await buildSharedMenuPdf(recap, brand))
    expect(text).toContain('Aurélien')
    expect(text).toContain('Écrasé de pommes de terre')
    expect(text).toContain('le devis définitif')
    expect(text).toContain('Tél. +33 6 71 17 06 73')
    expect(text).toContain('contact@exemple.fr')
    expect(text).toContain('j-jtraiteur.fr')
    expect(text).toContain('SIRET 815 186 382 00017')
    expect(text).toContain('Conditions : j-jtraiteur.fr/conditions-mariage')
    expect(text).toContain('tout compris, TTC (TVA 10 %)')
    expect(text).toContain('à confirmer 20 jours avant le mariage')
  })

  it('clean() ne remplace que les caractères hors WinAnsi', () => {
    expect(clean('Crème brûlée « maison » — l’été…')).toBe('Crème brûlée « maison » — l’été…')
    expect(clean('130 € et 12 h')).toBe('130 € et 12 h')
    expect(clean('Camille 🥂 Łukasz')).toBe('Camille ? ?ukasz')
  })
})

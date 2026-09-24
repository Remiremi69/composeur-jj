import { describe, expect, it } from 'vitest'
import { escapeHtml, singleLine } from '../../supabase/functions/_shared/html.ts'
import { coupleEmail, traiteurEmail } from '../../supabase/functions/submit-composition/emails.ts'
import type { RecapData } from '../../supabase/functions/submit-composition/recap.ts'

const piege = '<a href="https://phishing.example">Cliquez ici</a> & "Co"'

function recap(overrides: Partial<RecapData> = {}): RecapData {
  return {
    coupleNames: piege,
    email: 'couple@exemple.fr',
    weddingDate: '2027-06-19',
    guestCount: 100,
    formuleName: 'Signature <b>',
    sections: [
      {
        title: 'Votre plat <script>',
        lines: [{ name: 'Plat <img src=x onerror=alert(1)>', description: null, supplement: 3, quantity: 1 }],
      },
    ],
    options: [{ name: 'Option <i>', price: 250, priceUnit: 'forfait' }],
    estimate: {
      basePerPerson: 130,
      supplementsPerPerson: 3,
      optionsPerPerson: 0,
      forfaitOptions: 250,
      perPersonAllIn: 133,
      total: 13550,
    },
    ...overrides,
  }
}

describe('escapeHtml', () => {
  it('échappe les caractères HTML', () => {
    expect(escapeHtml('<a href="x">\'&')).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;')
  })
  it('gère null et les nombres', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(42)).toBe('42')
  })
})

describe('singleLine', () => {
  it('supprime les retours à la ligne des sujets', () => {
    expect(singleLine('A\r\nBcc: pirate@x.fr')).toBe('A Bcc: pirate@x.fr')
  })
})

describe('emails : aucune injection HTML', () => {
  for (const [nom, build] of [
    ['traiteur', traiteurEmail],
    ['couple', coupleEmail],
  ] as const) {
    it(`email ${nom} : toutes les valeurs dynamiques sont échappées`, () => {
      const { html } = build(recap())
      expect(html).not.toContain('<a href="https://phishing.example">')
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('<img src=x')
      expect(html).not.toContain('<b>')
      expect(html).not.toContain('<i>')
      expect(html).toContain('&lt;a href=&quot;https://phishing.example&quot;&gt;')
    })
  }

  it('reprend le prix par personne tout compris et le total serveur', () => {
    const { html } = coupleEmail(recap())
    expect(html).toMatch(/133\s€/)
    expect(html).toMatch(/13\s550\s€/)
  })

  it('le sujet contient les prénoms sans retour à la ligne', () => {
    const { subject } = traiteurEmail(recap({ coupleNames: 'A\nB' }))
    expect(subject).toBe('Nouvelle demande de menu — A B')
  })
})

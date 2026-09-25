import { describe, expect, it } from 'vitest'
import { escapeHtml, singleLine } from '../../supabase/functions/_shared/html.ts'
import { formatPhone, type RecapData } from '../../supabase/functions/_shared/recap.ts'
import { coupleEmail, traiteurEmail } from '../../supabase/functions/submit-composition/emails.ts'
import {
  reminderEmail,
  stepLabelOf,
  telHref,
} from '../../supabase/functions/send-draft-reminders/email.ts'

const piege = '<a href="https://phishing.example">Cliquez ici</a> & "Co"'
const norm = (s: string) => s.replace(/[  ]/g, ' ')

function recap(overrides: Partial<RecapData> = {}): RecapData {
  return {
    coupleNames: piege,
    weddingDate: '2027-06-19',
    guestCount: 100,
    formuleName: 'Signature <b>',
    sections: [
      {
        title: 'Votre plat <script>',
        lines: [{ name: 'Plat <img src=x onerror=alert(1)>', description: null, supplement: 3, quantity: 1 }],
      },
    ],
    options: [
      { name: 'Option <i>', price: 250, priceUnit: 'forfait' },
      { name: 'Buffet des gâteaux', price: null, priceUnit: 'forfait' },
    ],
    estimate: {
      basePerPerson: 130,
      supplementsPerPerson: 3,
      optionsPerPerson: 4.5,
      forfaitOptions: 250,
      perPersonAllIn: 137.5,
      total: 14000,
    },
    contact: {
      email: 'couple@exemple.fr',
      phone: '+33671170673',
      venue: 'Domaine <u>des Tilleuls</u>',
      dietaryNotes: '3 végétariens\n1 sans gluten <b>',
      message: 'Bonjour <script>alert(1)</script>',
    },
    ...overrides,
  }
}

describe('escapeHtml / singleLine', () => {
  it('échappe les caractères HTML', () => {
    expect(escapeHtml('<a href="x">\'&')).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(42)).toBe('42')
  })
  it('supprime les retours à la ligne des sujets', () => {
    expect(singleLine('A\r\nBcc: pirate@x.fr')).toBe('A Bcc: pirate@x.fr')
  })
})

describe('emails de soumission : aucune injection HTML', () => {
  for (const [nom, build] of [
    ['traiteur', traiteurEmail],
    ['couple', coupleEmail],
  ] as const) {
    it(`email ${nom} : toutes les valeurs dynamiques sont échappées`, () => {
      const { html } = build(recap())
      for (const brut of ['<a href="https://phishing.example">', '<script>', '<img src=x', '<b>', '<i>', '<u>']) {
        expect(html).not.toContain(brut)
      }
      expect(html).toContain('&lt;a href=&quot;https://phishing.example&quot;&gt;')
    })
  }

  it('le sujet contient les prénoms sans retour à la ligne', () => {
    expect(traiteurEmail(recap({ coupleNames: 'A\nB' })).subject).toBe('Nouvelle demande de menu — A B')
  })
})

describe('emails de soumission : prix et recontact', () => {
  it('prix par personne en avant, total en dessous', () => {
    const html = norm(coupleEmail(recap()).html)
    const perPerson = html.indexOf('137,50 €')
    const total = html.indexOf('14 000 €')
    expect(perPerson).toBeGreaterThan(-1)
    expect(total).toBeGreaterThan(perPerson)
    expect(html).toContain('par personne, tout compris')
    expect(html).toContain('dont 250 € d’options au forfait')
  })

  it('option sans prix affichée « Sur demande »', () => {
    expect(coupleEmail(recap()).html).toContain('Buffet des gâteaux (Sur demande)')
  })

  it('email traiteur : téléphone cliquable, email, lieu, allergies, message, provenance', () => {
    const { html } = traiteurEmail(recap(), 'instagram')
    expect(html).toContain('href="tel:+33671170673"')
    expect(html).toContain('+33 6 71 17 06 73')
    expect(html).toContain('mailto:couple@exemple.fr')
    expect(html).toContain('Domaine &lt;u&gt;des Tilleuls&lt;/u&gt;')
    expect(html).toContain('3 végétariens<br>1 sans gluten &lt;b&gt;')
    expect(html).toContain('Bonjour &lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('instagram')
  })

  it('email couple : rappel de ses informations, sans répéter son email', () => {
    const { html } = coupleEmail(recap())
    expect(html).toContain('Vos informations')
    expect(html).not.toContain('mailto:couple@exemple.fr')
  })

  it('formatPhone rend un numéro français lisible', () => {
    expect(formatPhone('+33671170673')).toBe('+33 6 71 17 06 73')
    expect(formatPhone('+32470123456')).toBe('+32470123456')
  })
})

describe('email de relance', () => {
  const data = {
    coupleNames: 'Camille <b>& Alex</b>',
    weddingDate: '2027-06-19',
    stepLabel: '« Vos pièces cocktail »',
    resumeUrl: 'https://composeur-jj.vercel.app/reprendre/306c2a9d-4de2-4a83-bd95-8a75d20be2e6',
    unsubscribeUrl: 'https://composeur-jj.vercel.app/desinscription/306c2a9d-4de2-4a83-bd95-8a75d20be2e6',
    traiteurPhone: '+33 6 71 17 06 73',
  }

  it('contient le bouton de reprise, l’étape, le téléphone et la désinscription', () => {
    const { subject, html } = reminderEmail(data)
    expect(subject).toBe('Votre menu de mariage vous attend')
    expect(html).toContain(`href="${data.resumeUrl}"`)
    expect(html).toContain('Reprendre mon menu')
    expect(html).toContain('à l’étape « Vos pièces cocktail »')
    expect(html).toContain('href="tel:+33671170673"')
    expect(html).toContain(`href="${data.unsubscribeUrl}"`)
    expect(html).toContain('19 juin 2027')
  })

  it('échappe les prénoms', () => {
    const { html } = reminderEmail(data)
    expect(html).not.toContain('<b>& Alex</b>')
    expect(html).toContain('Camille &lt;b&gt;&amp; Alex&lt;/b&gt;')
  })

  it('libellé de la dernière étape', () => {
    const steps = [{ slug: 'pieces-cocktail', title: 'Vos pièces cocktail' }]
    expect(stepLabelOf('pieces-cocktail', steps)).toBe('« Vos pièces cocktail »')
    expect(stepLabelOf('recap', steps)).toBe('le récapitulatif')
    expect(stepLabelOf('inconnue', steps)).toBeNull()
    expect(stepLabelOf(null, steps)).toBeNull()
  })

  it('lien tel: sans espaces', () => {
    expect(telHref('+33 6 71 17 06 73')).toBe('+33671170673')
  })
})

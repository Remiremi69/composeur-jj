// Email de relance d'un menu non terminé : sobre, aux couleurs de J&J.
// RÈGLE : toute valeur dynamique passe par escapeHtml().

import { COLORS, NO_CONTACT, type BrandContact } from '../_shared/brand.ts'
import { telHref } from '../_shared/core/format.ts'
import { emailLayout } from '../_shared/email-layout.ts'
import { escapeHtml, singleLine } from '../_shared/html.ts'
import { formatDate } from '../_shared/recap.ts'

export { telHref }

export interface ReminderData {
  coupleNames: string
  weddingDate: string | null
  stepLabel: string | null // « Vos pièces cocktail »… ou null si inconnue
  resumeUrl: string // SITE_URL/reprendre/:token
  unsubscribeUrl: string // SITE_URL/desinscription/:token
  traiteurPhone: string | null // affichage, ex : « +33 6 71 17 06 73 »
  brand?: BrandContact // coordonnées du pied de page
}

// Pages du parcours qui ne sont pas des étapes de composition.
const PAGE_LABELS: Record<string, string> = {
  formule: 'le choix de la formule',
  options: 'les petits plus',
  recap: 'le récapitulatif',
}

// Libellé de la dernière étape atteinte (slug d'étape ou page).
export function stepLabelOf(
  lastStep: string | null,
  steps: { slug: string; title: string; group_slug?: string | null; group_title?: string | null }[],
): string | null {
  if (!lastStep) return null
  if (PAGE_LABELS[lastStep]) return PAGE_LABELS[lastStep]
  const step = steps.find((s) => s.slug === lastStep)
  if (step) return `« ${step.title} »`
  // Depuis le lot 3, la dernière étape peut être un écran groupé (« assiette »).
  const grouped = steps.find((s) => s.group_slug === lastStep && s.group_title)
  return grouped ? `« ${grouped.group_title} »` : null
}

export function reminderEmail(d: ReminderData): { subject: string; html: string } {
  const date = formatDate(d.weddingDate)
  const quand = date ? ` pour le ${escapeHtml(date)}` : ''
  const etape = d.stepLabel ? `, à l’étape ${escapeHtml(d.stepLabel)}` : ''
  const phone = d.traiteurPhone
    ? `Une question ? Appelez-nous au <a href="tel:${escapeHtml(telHref(d.traiteurPhone))}" style="color:${COLORS.slate};font-weight:bold">${escapeHtml(d.traiteurPhone)}</a>, ou répondez simplement à cet email.`
    : 'Une question ? Répondez simplement à cet email.'

  const html = emailLayout({
    brand: d.brand ?? { ...NO_CONTACT, phone: d.traiteurPhone },
    title: 'Votre menu de mariage vous attend',
    preheader: 'Reprenez votre menu là où vous l’aviez laissé.',
    bodyHtml: `
      <p style="margin:0 0 12px">Bonjour ${escapeHtml(d.coupleNames)},</p>
      <p style="margin:0">Vous avez commencé à composer votre menu de mariage${quand} sur notre site. Il est bien enregistré : vous pouvez le reprendre là où vous l’aviez laissé${etape}.</p>`,
    cta: { label: 'Reprendre mon menu', url: d.resumeUrl },
    footerNoteHtml: `${phone}<br><br>Vous recevez ce message une seule fois, parce que vous avez commencé un menu sur le Composeur de J&amp;J Traiteur.
      <a href="${escapeHtml(d.unsubscribeUrl)}" style="color:${COLORS.slate}">Ne plus recevoir de rappel</a>`,
  })

  return { subject: singleLine('Votre menu de mariage vous attend'), html }
}

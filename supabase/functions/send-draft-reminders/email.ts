// Email de relance d'un menu non terminé : sobre, aux couleurs de J&J.
// RÈGLE : toute valeur dynamique passe par escapeHtml().

import { escapeHtml, singleLine } from '../_shared/html.ts'
import { formatDate } from '../_shared/recap.ts'

const MUTED = '#8a7f74'
const INK = '#2b2521'
const ACCENT = '#8c6a3f'
const CREAM = '#faf6ef'

export interface ReminderData {
  coupleNames: string
  weddingDate: string | null
  stepLabel: string | null // « Vos pièces cocktail »… ou null si inconnue
  resumeUrl: string // SITE_URL/reprendre/:token
  unsubscribeUrl: string // SITE_URL/desinscription/:token
  traiteurPhone: string | null // affichage, ex : « +33 6 71 17 06 73 »
}

// Pages du parcours qui ne sont pas des étapes de composition.
const PAGE_LABELS: Record<string, string> = {
  formule: 'le choix de la formule',
  options: 'les options',
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

// « +33 6 71 17 06 73 » → « +33671170673 » pour un lien tel:.
export function telHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export function reminderEmail(d: ReminderData): { subject: string; html: string } {
  const date = formatDate(d.weddingDate)
  const quand = date ? ` pour le ${escapeHtml(date)}` : ''
  const etape = d.stepLabel ? `, à l’étape ${escapeHtml(d.stepLabel)}` : ''
  const phone = d.traiteurPhone
    ? `Une question ? Appelez-nous au <a href="tel:${escapeHtml(telHref(d.traiteurPhone))}" style="color:${ACCENT}">${escapeHtml(d.traiteurPhone)}</a>, ou répondez simplement à cet email.`
    : 'Une question ? Répondez simplement à cet email.'

  const html = `
    <div style="font-family:Arial,sans-serif;color:${INK};max-width:560px;margin:auto;background:${CREAM};padding:28px 24px;border-radius:12px">
      <p style="margin:0;text-transform:uppercase;letter-spacing:2px;color:${ACCENT};font-size:13px">J&amp;J Traiteur</p>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:normal;margin:8px 0 16px">Votre menu de mariage vous attend</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Bonjour ${escapeHtml(d.coupleNames)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px">Vous avez commencé à composer votre menu de mariage${quand} sur notre site. Il est bien enregistré : vous pouvez le reprendre là où vous l’aviez laissé${etape}.</p>
      <p style="text-align:center;margin:0 0 24px">
        <a href="${escapeHtml(d.resumeUrl)}" style="display:inline-block;background:${ACCENT};color:${CREAM};text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:999px">Reprendre mon menu</a>
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 24px">${phone}</p>
      <p style="font-size:12px;line-height:1.5;color:${MUTED};margin:0">Vous recevez ce message une seule fois, parce que vous avez commencé un menu sur le Composeur de J&amp;J Traiteur.
      <a href="${escapeHtml(d.unsubscribeUrl)}" style="color:${MUTED}">Ne plus recevoir de rappel</a></p>
    </div>`

  return { subject: singleLine('Votre menu de mariage vous attend'), html }
}

// Textes et réglages propres à J&J Traiteur, rassemblés ici pour être
// modifiés sans toucher au code des pages.

// Page de confirmation : ce qui se passe après l'envoi.
export const CONFIRMATION_MESSAGE =
  'Jessica et Jérôme ont reçu votre menu et vous appellent sous 48 h.'

// Texte prérempli du partage (WhatsApp, partage natif du téléphone).
export function shareText(link: string): string {
  return `Regarde le menu qu'on a composé pour notre mariage 🥂 ${link}`
}

// Adresse publique du Composeur (ex. https://composer.j-jtraiteur.fr), pour
// les liens partagés. Repli : l'adresse de la page en cours.
export function appUrl(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined
  return (configured || window.location.origin).replace(/\/+$/, '')
}

// Prise de rendez-vous en ligne (Calendly…). Absente : bouton « Nous appeler ».
export const BOOKING_URL = (import.meta.env.VITE_BOOKING_URL as string | undefined) || null

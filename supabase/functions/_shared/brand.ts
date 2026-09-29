// Identité J&J Traiteur côté serveur (emails, PDF).
// Couleurs : équivalents hexadécimaux de la charte oklch de src/index.css
// (les messageries et le PDF ne comprennent pas oklch). Même logique de
// contraste que le site : le bronze ne sert jamais de couleur de texte.

export const COLORS = {
  slate: '#435464', // ardoise : titres, boutons
  slateDeep: '#2e3b47',
  lin: '#e2dacf', // filets, bordures, texte des boutons
  linLight: '#f4f0ea', // fond
  ink: '#1c232a', // texte
  bronze: '#b08a62', // décor : filets, badges
  fond: '#fbf9f6', // cartes
} as const

export const BRAND = {
  name: 'J&J Traiteur',
  siteUrl: 'https://j-jtraiteur.fr', // site vitrine
  siteLabel: 'j-jtraiteur.fr',
  conditionsUrl: 'https://j-jtraiteur.fr/conditions-mariage', // cf. src/config/brand.ts
  conditionsLabel: 'j-jtraiteur.fr/conditions-mariage',
  siret: '815 186 382 00017',
  // Rappel des conditions de mariage (récap, email du couple, PDF).
  goodToKnow: [
    'Nombre définitif d’invités et choix du menu : à confirmer 20 jours avant le mariage.',
    'Acomptes : 30 % à la signature, 30 % un mois avant le mariage, le solde le lendemain.',
  ],
  priceTax: 'TTC (TVA 10 %)',
} as const

// Coordonnées lues dans les secrets de la fonction.
export interface BrandContact {
  phone: string | null // TRAITEUR_PHONE (source unique du téléphone)
  email: string | null // REPLY_TO_EMAIL (adresse de contact de J&J)
  appUrl: string | null // SITE_URL (adresse publique du Composeur)
}

export const NO_CONTACT: BrandContact = { phone: null, email: null, appUrl: null }

export function brandContact(get: (name: string) => string): BrandContact {
  return {
    phone: get('TRAITEUR_PHONE') || null,
    email: get('REPLY_TO_EMAIL') || null,
    appUrl: get('SITE_URL').replace(/\/+$/, '') || null,
  }
}

// Logo pour les emails : adresse publique sur le Composeur.
export function logoUrl(contact: BrandContact): string | null {
  return contact.appUrl ? `${contact.appUrl}/brand/jj-logo-slate.png` : null
}

// Échappement HTML : TOUTE valeur injectée dans un email passe par ici.
// Empêche l'injection de balises (ex : un lien d'hameçonnage glissé dans
// les prénoms du couple).

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c])
}

// Texte d'un sujet d'email : une seule ligne, longueur bornée.
export function singleLine(value: unknown, max = 150): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max)
}

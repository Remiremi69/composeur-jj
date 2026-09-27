// Synchronise le logo J&J avec le code des Edge Functions (en-tête du PDF).
// Usage : npm run brand:sync
//
// Pourquoi : les fonctions tournent chez Supabase et ne voient pas le dossier
// public/ (servi par Vercel). Le logo du PDF est donc intégré au code, encodé
// en base64, dans supabase/functions/_shared/brand-logo.ts.
//
// • PNG présent : le fichier généré contient le logo ;
// • PNG absent : le fichier généré est vide (repli texte « J&J Traiteur »).
// Le test tests/functions/brand-logo.test.ts échoue tant que les deux ne
// concordent pas. Après synchronisation : redéployer les fonctions.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('../public/brand/jj-logo-slate.png', import.meta.url))
const out = fileURLToPath(new URL('../supabase/functions/_shared/brand-logo.ts', import.meta.url))

let base64 = ''
if (existsSync(src)) {
  const bytes = readFileSync(src)
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!isPng) {
    console.error('public/brand/jj-logo-slate.png n’est pas un vrai fichier PNG.')
    process.exit(1)
  }
  if (bytes.length > 300_000) {
    console.warn(`Attention : logo lourd (${Math.round(bytes.length / 1024)} ko). Un PNG de moins de 100 ko suffit.`)
  }
  base64 = bytes.toString('base64')
}

writeFileSync(
  out,
  `// FICHIER GÉNÉRÉ par « npm run brand:sync » — ne pas modifier à la main.
// Logo J&J (public/brand/jj-logo-slate.png) encodé en base64, intégré au PDF.
// Chaîne vide = pas de logo : le PDF affiche « J&J Traiteur » en texte.
export const LOGO_PNG_BASE64 = '${base64}'
`,
)

console.log(
  base64
    ? `Logo synchronisé (${Math.round((base64.length * 3) / 4 / 1024)} ko) → supabase/functions/_shared/brand-logo.ts`
    : 'Aucun logo dans public/brand/ : le PDF garde le repli texte « J&J Traiteur ».',
)
console.log('Étape suivante : redéployer submit-composition, menu-pdf et send-draft-reminders (cf. docs/DEPLOY.md).')

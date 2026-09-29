// Prépare les photos des plats pour le site.
// Usage : npm run photos -- <dossier-source>
//
// Chaque image du dossier (jpg, jpeg, png, webp, jfif) devient
// public/plats/<nom-du-fichier>.webp : 800 × 600 (format 4:3 des cartes),
// recadrée au centre, qualité 78 — environ 50 à 120 ko.
// Le nom du fichier source (sans extension) donne le nom de sortie :
// nommez vos fichiers comme le slug voulu (ex. « spritz.jpg » → spritz.webp).
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = process.argv[2]
if (!src || !existsSync(src)) {
  console.error('Indiquez le dossier des photos : npm run photos -- "C:\\chemin\\vers\\photos"')
  process.exit(1)
}
const out = fileURLToPath(new URL('../public/plats/', import.meta.url))
mkdirSync(out, { recursive: true })

const files = readdirSync(src).filter((f) => /\.(jpe?g|png|webp|jfif)$/i.test(f))
for (const file of files) {
  const slug = basename(file, extname(file))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const dest = join(out, `${slug}.webp`)
  const info = await sharp(join(src, file))
    .rotate() // orientation des photos de téléphone
    .resize(800, 600, { fit: 'cover', position: 'centre' })
    .webp({ quality: 78 })
    .toFile(dest)
  console.log(`${file} → public/plats/${slug}.webp (${Math.round(info.size / 1024)} ko)`)
}

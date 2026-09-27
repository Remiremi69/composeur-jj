// Contrastes WCAG de la charte, lus directement dans src/index.css
// (composantes oklch). Toute nouvelle palette est donc re-mesurée
// automatiquement.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COLORS } from '../supabase/functions/_shared/brand.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const css = readFileSync(join(root, 'src/index.css'), 'utf8')

type RGB = [number, number, number] // sRGB linéaire, 0–1

function token(name: string): RGB {
  const m = new RegExp(`--color-${name}:\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s*;`).exec(css)
  if (!m) throw new Error(`Couleur --color-${name} introuvable dans index.css`)
  return oklchToLinear(Number(m[1]), Number(m[2]), Number(m[3]))
}

// oklch → sRGB linéaire (Björn Ottosson), borné à la gamme sRGB.
function oklchToLinear(L: number, C: number, h: number): RGB {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function toHex(c: RGB): string {
  return (
    '#' +
    c
      .map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))
      .map((x) => Math.round(x * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

// Texte courant : 4,5:1 minimum (WCAG AA).
const pairs: [texte: string, fond: string, usage: string][] = [
  ['ink', 'lin-light', 'texte courant sur le fond général'],
  ['ink', 'fond', 'texte courant sur les cartes'],
  ['slate', 'lin-light', 'titres et texte secondaire sur le fond général'],
  ['slate', 'fond', 'titres et texte secondaire sur les cartes'],
  ['lin', 'slate', 'texte des boutons principaux'],
  ['lin', 'slate-deep', 'texte des boutons au survol'],
  ['ink', 'bronze', 'badges et coches (fond bronze)'],
  ['error', 'lin-light', 'erreurs de formulaire'],
  ['error', 'fond', 'erreurs de formulaire sur les cartes'],
]

describe('contrastes de la charte (WCAG AA, texte courant ≥ 4,5:1)', () => {
  for (const [text, bg, usage] of pairs) {
    it(`--color-${text} sur --color-${bg} (${usage})`, () => {
      const ratio = contrast(token(text), token(bg))
      expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('le bronze reste décoratif : jamais du texte lisible sur fond clair', () => {
    // Bronze sur lin clair ≈ 2,8:1 : chaque « text-bronze » doit être masqué
    // aux lecteurs d'écran (aria-hidden), donc purement décoratif.
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(name)) {
          readFileSync(path, 'utf8')
            .split('\n')
            .forEach((line, i) => {
              if (/\btext-bronze\b/.test(line) && !line.includes('aria-hidden')) offenders.push(`${path}:${i + 1}`)
            })
        }
      }
    }
    walk(join(root, 'src'))
    expect(offenders).toEqual([])
  })

  it('les couleurs sont toujours utilisées via oklch(var(--color-…))', () => {
    // Les variables contiennent des composantes (« 0.438 0.034 247 ») : un
    // var(--color-x) employé seul ne donne AUCUNE couleur.
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.(tsx?|css)$/.test(name)) {
          readFileSync(path, 'utf8')
            .split('\n')
            .forEach((line, i) => {
              if (/(?<!oklch\()var\(--color-/.test(line)) offenders.push(`${path}:${i + 1}`)
            })
        }
      }
    }
    walk(join(root, 'src'))
    expect(offenders).toEqual([])
  })
})

describe('couleurs des emails et du PDF = charte du site', () => {
  const map: [keyof typeof COLORS, string][] = [
    ['slate', 'slate'],
    ['slateDeep', 'slate-deep'],
    ['lin', 'lin'],
    ['linLight', 'lin-light'],
    ['ink', 'ink'],
    ['bronze', 'bronze'],
    ['fond', 'fond'],
  ]
  for (const [key, name] of map) {
    it(`${key} (${COLORS[key]}) correspond à --color-${name}`, () => {
      expect(COLORS[key]).toBe(toHex(token(name)))
    })
  }
})

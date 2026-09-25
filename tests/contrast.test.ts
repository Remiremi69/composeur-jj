// Contrastes WCAG des couleurs du thème, lues directement dans src/index.css.
// Toute nouvelle palette (lot 4) est donc re-mesurée automatiquement.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/index.css', import.meta.url)), 'utf8')

function token(name: string): string {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!m) throw new Error(`Couleur --color-${name} introuvable dans index.css`)
  return m[1]
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Texte courant : 4,5:1 minimum (WCAG AA).
const pairs: [texte: string, fond: string][] = [
  ['ink', 'cream'],
  ['ink', 'surface'],
  ['muted', 'cream'],
  ['muted', 'surface'],
  ['accent', 'cream'],
  ['accent', 'surface'],
  ['cream', 'accent'], // texte des boutons principaux
  ['error', 'cream'],
  ['error', 'surface'],
]

describe('contrastes du thème (WCAG AA, texte courant ≥ 4,5:1)', () => {
  for (const [text, bg] of pairs) {
    it(`--color-${text} sur --color-${bg}`, () => {
      const ratio = contrast(token(text), token(bg))
      expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    })
  }
})

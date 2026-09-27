// Le logo intégré au PDF (_shared/brand-logo.ts) doit correspondre au fichier
// public/brand/jj-logo-slate.png. Si ce test échoue : npm run brand:sync,
// puis redéployer les fonctions (cf. docs/DEPLOY.md).
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOGO_PNG_BASE64 } from '../../supabase/functions/_shared/brand-logo.ts'

const png = fileURLToPath(new URL('../../public/brand/jj-logo-slate.png', import.meta.url))

describe('logo du PDF synchronisé avec public/brand/', () => {
  it('brand-logo.ts est à jour (sinon : npm run brand:sync)', () => {
    const expected = existsSync(png) ? readFileSync(png).toString('base64') : ''
    expect(
      LOGO_PNG_BASE64 === expected,
      existsSync(png)
        ? 'Le logo de public/brand/ a changé : lancez « npm run brand:sync » puis redéployez les fonctions.'
        : 'Aucun logo dans public/brand/, mais un logo est encore intégré : lancez « npm run brand:sync ».',
    ).toBe(true)
  })
})

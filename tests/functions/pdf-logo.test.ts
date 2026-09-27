// En-tête du PDF quand le logo est intégré (npm run brand:sync) : l'image
// remplace le nom en texte. Logo simulé par un PNG de 1 × 1 pixel.
import { describe, expect, it, vi } from 'vitest'
import { buildPdf } from '../../supabase/functions/_shared/pdf.ts'
import type { RecapData } from '../../supabase/functions/_shared/recap.ts'

vi.mock('../../supabase/functions/_shared/brand-logo.ts', () => ({
  LOGO_PNG_BASE64:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
}))

const recap: RecapData = {
  coupleNames: 'Camille & Alex',
  weddingDate: null,
  guestCount: 80,
  formuleName: 'Signature',
  sections: [],
  options: [],
  included: [],
  estimate: { basePerPerson: 100, supplementsPerPerson: 0, optionsPerPerson: 0, forfaitOptions: 0, perPersonAllIn: 100, total: 8000 },
  contact: null,
}

describe('PDF avec logo', () => {
  it('intègre le logo comme image', async () => {
    const bytes = await buildPdf(recap, { includeContact: false, brand: { phone: null, email: null, appUrl: null } })
    expect(Buffer.from(bytes).toString('latin1')).toMatch(/\/Subtype\s*\/Image/)
  })
})

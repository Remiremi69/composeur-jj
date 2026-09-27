// PDF partageable d'un menu envoyé : même mise en page que le PDF joint aux
// emails, mais SANS la section « Vos informations » (téléphone, lieu,
// allergies, message). Double sécurité : les coordonnées sont retirées des
// données ET la section est désactivée.

import type { BrandContact } from '../_shared/brand.ts'
import { buildPdf } from '../_shared/pdf.ts'
import type { RecapData } from '../_shared/recap.ts'

export function buildSharedMenuPdf(recap: RecapData, brand: BrandContact): Promise<Uint8Array> {
  return buildPdf({ ...recap, contact: null }, { includeContact: false, brand })
}

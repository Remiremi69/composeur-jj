// Le catalogue est chargé UNE seule fois par <CatalogProvider> (cf.
// src/context/CatalogContext.tsx). Ce hook se contente de le lire.
export { useCatalog } from '../context/CatalogContext'
export type { CatalogState } from '../context/CatalogContext'

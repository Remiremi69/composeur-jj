// Noyau métier partagé — types du catalogue et de la soumission.
// TypeScript pur : aucune API Deno ni navigateur. Importé à la fois par
// l'Edge Function (Deno) et par le front (via l'alias @core/*).
// Source de vérité = la base Supabase (cf. supabase/migrations/).

export type RuleType = 'exact_count' | 'pick_one' | 'pick_range' | 'free'
export type PriceUnit = 'par_piece' | 'par_personne' | 'forfait'

export interface Step {
  id: string
  slug: string
  title: string
  subtitle: string | null
  position: number
  rule_type: RuleType
  rule_min: number | null
  rule_max: number | null
  unit_label: string | null
}

// Surcharge de règle par formule : pour une étape donnée (slug), impose un
// nombre min/max propre à cette formule (ex : 4 pièces pour Signature, 8 pour
// Harmonie). Si absent pour une étape, on garde la règle par défaut de l'étape.
export type StepRuleOverride = { min?: number | null; max?: number | null }

export interface Formule {
  id: string
  slug: string
  name: string
  subtitle: string | null
  price_per_person: number
  included_steps: string[] // slugs des étapes incluses
  highlights: string[] // lignes affichées sur la carte de la formule
  step_rules?: Record<string, StepRuleOverride> | null // surcharges de règles par étape
  position: number
  is_active: boolean | null
}

export interface Option {
  id: string
  slug: string
  category: string
  name: string
  description: string | null
  price: number | null // vide = « Sur demande », 0 = « Offert »
  price_unit: 'par_personne' | 'forfait'
  position: number
  is_active: boolean | null
}

export interface Inclusion {
  id: string
  group_label: string
  label: string
  position: number
  is_active: boolean | null
}

export interface Item {
  id: string
  step_id: string
  name: string
  description: string | null
  photo_url: string | null
  price: number
  price_unit: PriceUnit
  supplement: number // + X € / personne
  labels: string[] // régime : V, VG, SG
  category: string | null // sous-type dans l'étape (ex : "Verrines", "Viande")
  allergens: string[]
  is_seasonal: boolean | null
  season_note: string | null
  is_active: boolean | null
  position: number
}

// Sélections en cours : item_id -> quantité choisie.
export type Selections = Record<string, number>

// Catalogue complet nécessaire à la validation d'une composition.
export interface Catalog {
  formules: Formule[]
  steps: Step[]
  items: Item[]
  options: Option[]
}

// Données envoyées par le couple lors de la soumission.
export interface CompositionPayload {
  coupleNames: string
  email: string
  weddingDate?: string | null // AAAA-MM-JJ
  guestCount: number
  formuleId: string
  selections: Selections
  optionIds: string[]
  // Pour recontacter le couple (saisis sur la page récap)
  phone: string
  venue: string
  dietaryNotes?: string | null
  message?: string | null
}

// Paramètres d'arrivée sur le site (?source=, utm_*…), pour l'attribution.
export type LandingParams = Record<string, string>

// État de composition sauvegardé dans un brouillon (colonne client_state).
export interface ClientState {
  selections: Selections
  optionIds: string[]
  currentStep: string | null // slug de l'étape ou page (formule, options, recap)
}

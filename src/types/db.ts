// Types reflétant le schéma Supabase (cf. supabase/schema.sql).
// Source de vérité = la base. Aucune donnée métier en dur ici.

export type RuleType = 'exact_count' | 'pick_one' | 'pick_range' | 'free'
export type PriceUnit = 'par_piece' | 'par_personne' | 'forfait'
export type CompositionStatus = 'draft' | 'submitted'

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
  highlights: string[] // puces "ce qui est inclus"
  step_rules?: Record<string, StepRuleOverride> // surcharges de règles par étape
  position: number
  is_active: boolean
}

export interface Option {
  id: string
  slug: string
  category: string // 'bar-de-nuit' | 'en-cas' | 'brunch'
  name: string
  description: string | null
  price: number
  price_unit: 'par_personne' | 'forfait'
  position: number
  is_active: boolean
}

export interface Inclusion {
  id: string
  group_label: string
  label: string
  position: number
  is_active: boolean
}

export interface Item {
  id: string
  step_id: string
  name: string
  description: string | null
  photo_url: string | null
  price: number
  price_unit: PriceUnit
  supplement: number // +X € / personne
  labels: string[] // régime : V, VG, SG
  category: string | null // sous-type dans l'étape (ex : "Verrines", "Viande")
  allergens: string[]
  is_seasonal: boolean
  season_note: string | null
  is_active: boolean
  position: number
}

export interface Composition {
  id: string
  created_at: string
  formule_id: string | null
  couple_names: string | null
  email: string | null
  phone: string | null
  wedding_date: string | null
  guest_count: number | null
  status: CompositionStatus
  total_estimate: number | null
  handled: boolean
  share_token: string
}

export interface CompositionItem {
  composition_id: string
  item_id: string
  quantity: number
}

export interface CompositionOption {
  composition_id: string
  option_id: string
}

// Sélections en cours côté front : item_id -> quantité choisie.
export type Selections = Record<string, number>

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

export interface Item {
  id: string
  step_id: string
  name: string
  description: string | null
  photo_url: string | null
  price: number
  price_unit: PriceUnit
  allergens: string[]
  is_seasonal: boolean
  season_note: string | null
  is_active: boolean
  position: number
}

export interface Composition {
  id: string
  created_at: string
  couple_names: string | null
  email: string | null
  phone: string | null
  wedding_date: string | null
  guest_count: number | null
  status: CompositionStatus
  total_estimate: number | null
  share_token: string
}

export interface CompositionItem {
  composition_id: string
  item_id: string
  quantity: number
}

// Sélections en cours côté front : item_id -> quantité choisie.
export type Selections = Record<string, number>

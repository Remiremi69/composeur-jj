// Types reflétant le schéma Supabase (cf. supabase/migrations/).
// Les types du catalogue viennent du noyau métier partagé (@core/types),
// utilisé aussi par l'Edge Function. Seuls les types des compositions
// (back-office) sont définis ici.

export type {
  Catalog,
  CompositionPayload,
  Formule,
  Inclusion,
  Item,
  Option,
  PriceUnit,
  RuleType,
  Selections,
  Step,
  StepRuleOverride,
} from '@core/types'

export type CompositionStatus = 'draft' | 'submitted'

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
  emails_sent_at: string | null // renseigné quand les emails sont partis
  updated_at: string
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


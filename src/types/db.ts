// Types reflétant le schéma Supabase (cf. supabase/migrations/).
// Les types du catalogue viennent du noyau métier partagé (@core/types),
// utilisé aussi par l'Edge Function. Seuls les types des compositions
// (back-office) sont définis ici.

export type {
  Catalog,
  ClientState,
  CompositionPayload,
  LandingParams,
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

import type { Estimate } from '@core/pricing'

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
  handled: boolean // ancien « traité » (lot 5 : remplacé par crm_status, plus affiché)
  share_token: string
  emails_sent_at: string | null // renseigné quand les emails sont partis
  updated_at: string
  // Lot 2 — recontact et suivi
  venue: string | null
  dietary_notes: string | null
  message: string | null
  source: string | null
  landing_params: Record<string, string> | null
  last_step: string | null
  reminder_sent_at: string | null
  reminders_opt_out: boolean
  consent_at: string | null // date d'envoi (acceptation de la mention)
  // Lot 5 — pilotage
  crm_status: CrmStatus
  lost_reason: LostReason | null
  contacted_at: string | null // premier contact
  estimate: Estimate | null // détail du prix figé à l'envoi (absent avant le lot 5)
  is_test: boolean
}

export type CrmStatus = 'nouveau' | 'contacte' | 'degustation' | 'devis_envoye' | 'signe' | 'perdu'
export type LostReason = 'prix' | 'date_indisponible' | 'autre_traiteur' | 'sans_reponse' | 'autre'

// Note interne ou changement de statut (écrit par un déclencheur en base).
export interface CompositionNote {
  id: string
  composition_id: string
  author_id: string | null
  author_email: string | null
  kind: 'note' | 'statut'
  body: string | null
  from_status: CrmStatus | null
  to_status: CrmStatus | null
  created_at: string
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


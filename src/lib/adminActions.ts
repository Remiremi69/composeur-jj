// Écritures du back-office (admin connecté, protégées par RLS / is_admin()).
import { supabase } from './supabase'
import type { CrmStatus, LostReason } from '../types/db'
import type { ContactOrigin } from './contacts'

// Le déclencheur en base écrit l'historique et la date de premier contact.
export async function updateCrmStatus(id: string, status: CrmStatus, lostReason: LostReason | null): Promise<boolean> {
  const { error } = await supabase.from('compositions').update({ crm_status: status, lost_reason: lostReason }).eq('id', id)
  return !error
}

export interface NewContact {
  coupleNames: string
  phone: string // déjà normalisé (+33…)
  email: string | null
  weddingDate: string | null
  guestCount: number | null
  origin: ContactOrigin
  note: string | null
  alreadyCalled: boolean
}

// Fiche « sans menu » (cf. migration 20261026120000_contacts_traiteur.sql).
export async function addContact(c: NewContact): Promise<string | null> {
  const { data, error } = await supabase.rpc('ajouter_contact', {
    p_couple_names: c.coupleNames,
    p_phone: c.phone,
    p_email: c.email,
    p_wedding_date: c.weddingDate,
    p_guest_count: c.guestCount,
    p_source: c.origin,
    p_note: c.note,
    p_deja_appele: c.alreadyCalled,
  })
  if (error || typeof data !== 'string') {
    console.error('[ajout de contact]', error)
    return null
  }
  return data
}

// @vitest-environment jsdom
//
// Espace traiteur (lot 7) : boutons des cartes, envoi du configurateur,
// alerte « Ce contact existe déjà ». Aucun appel réseau.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import RequestCard from '../../src/components/admin/RequestCard'
import AddContactSheet from '../../src/components/admin/AddContactSheet'
import type { Composition } from '../../src/types/db'

const addContact = vi.fn(async () => 'nouvelle-fiche')
vi.mock('../../src/lib/adminActions', () => ({
  addContact: (...args: unknown[]) => addContact(...(args as [])),
  updateCrmStatus: vi.fn(async () => true),
}))

afterEach(() => {
  cleanup()
  addContact.mockClear()
})

const NOW = new Date('2026-10-26T10:00:00Z').getTime()
const TOKEN = '0f8c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f'

function comp(extra: Partial<Composition> = {}): Composition {
  return {
    id: 'c1',
    created_at: '2026-10-20T10:00:00Z',
    formule_id: 'f1',
    couple_names: 'Léa & Tom',
    email: 'lea@exemple.fr',
    phone: '+33611223344',
    wedding_date: '2027-06-19',
    guest_count: 120,
    status: 'submitted',
    total_estimate: 15000,
    handled: false,
    share_token: TOKEN,
    emails_sent_at: null,
    updated_at: '2026-10-20T10:00:00Z',
    venue: null,
    dietary_notes: null,
    message: null,
    source: null,
    landing_params: null,
    last_step: null,
    reminder_sent_at: null,
    reminders_opt_out: false,
    consent_at: '2026-10-20T10:00:00Z',
    crm_status: 'nouveau',
    lost_reason: null,
    contacted_at: null,
    estimate: null,
    is_test: false,
    ajout_manuel: false,
    ...extra,
  }
}

const card = (c: Composition, onSend = () => {}) =>
  render(<RequestCard composition={c} duplicate={false} now={NOW} onOpen={() => {}} onSend={onSend} onChanged={() => {}} />)

describe('carte d’une demande', () => {
  it('fiche sans menu : « Envoyer le configurateur », pas de « Voir le menu »', () => {
    const onSend = vi.fn()
    card(comp({ ajout_manuel: true, consent_at: null, formule_id: null, source: 'salon' }), onSend)
    expect(screen.queryByText('Voir le menu')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le configurateur' }))
    expect(onSend).toHaveBeenCalled()
    expect(screen.getByText('Pas encore de menu')).toBeTruthy()
  })

  it('fiche avec menu : « Voir le menu » (/menu/:token), pas d’envoi du configurateur', () => {
    card(comp())
    expect(screen.queryByText('Envoyer le configurateur')).toBeNull()
    expect(screen.getByText('Voir le menu').getAttribute('href')).toBe(`/menu/${TOKEN}`)
  })

  it('contact ajouté à la main qui a envoyé son menu : « Voir le menu »', () => {
    card(comp({ ajout_manuel: true, source: 'telephone' }))
    expect(screen.getByText('Voir le menu')).toBeTruthy()
    expect(screen.queryByText('Envoyer le configurateur')).toBeNull()
  })

  it('appeler et WhatsApp en un tap ; en rouge après 48 h', () => {
    card(comp())
    expect(screen.getByText('Appeler').getAttribute('href')).toBe('tel:+33611223344')
    expect(screen.getByText('WhatsApp').getAttribute('href')).toBe('https://wa.me/33611223344')
    expect(screen.getByText('À rappeler depuis plus de 48 h')).toBeTruthy()
    expect(screen.getByText('reçu il y a 6 jours')).toBeTruthy()
  })
})

describe('ajouter un contact', () => {
  function fill(phone: string) {
    fireEvent.change(screen.getByLabelText('Prénoms *'), { target: { value: 'Léa & Tom' } })
    fireEvent.change(screen.getByLabelText('Téléphone *'), { target: { value: phone } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le contact' }))
  }

  it('doublon : « Ce contact existe déjà », lien vers la fiche, puis « Ajouter quand même »', async () => {
    const onOpen = vi.fn()
    render(<AddContactSheet compositions={[comp()]} onClose={() => {}} onOpen={onOpen} onCreated={() => {}} />)
    fill('06 11 22 33 44')
    expect(screen.getByText('Ce contact existe déjà')).toBeTruthy()
    expect(addContact).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Léa & Tom/ }))
    expect(onOpen).toHaveBeenCalledWith('c1')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter quand même' }))
    await waitFor(() => expect(addContact).toHaveBeenCalledTimes(1))
    expect(addContact.mock.calls[0]).toEqual([
      expect.objectContaining({ phone: '+33611223344', origin: 'telephone', alreadyCalled: true }),
    ])
  })

  it('« Déjà appelé » est coché par défaut ; décoché, il est transmis tel quel', async () => {
    render(<AddContactSheet compositions={[]} onClose={() => {}} onOpen={() => {}} onCreated={() => {}} />)
    const box = screen.getByLabelText('Déjà appelé') as HTMLInputElement
    expect(box.checked).toBe(true)
    fireEvent.click(box)
    fill('07 00 00 00 01')
    await waitFor(() => expect(addContact).toHaveBeenCalledTimes(1))
    expect(addContact.mock.calls[0]).toEqual([expect.objectContaining({ alreadyCalled: false, email: null })])
  })

  it('téléphone illisible : message clair, rien n’est enregistré', () => {
    render(<AddContactSheet compositions={[]} onClose={() => {}} onOpen={() => {}} onCreated={() => {}} />)
    fill('12')
    expect(screen.getByText('Numéro de téléphone non reconnu.')).toBeTruthy()
    expect(addContact).not.toHaveBeenCalled()
  })
})

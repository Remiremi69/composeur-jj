import { useState } from 'react'
import type { FormEvent } from 'react'
import { isValidEmail, normalizePhone } from '@core/validation'
import type { Composition } from '../../types/db'
import { CONTACT_ORIGINS, findDuplicates, isWithoutMenu, type ContactOrigin } from '../../lib/contacts'
import { addContact } from '../../lib/adminActions'
import { formatDate } from '../../lib/format'

interface Props {
  compositions: Composition[]
  onClose: () => void
  onOpen: (id: string) => void // ouvrir une fiche (doublon, ou la fiche créée)
  onCreated: () => void
}

// « Ajouter un contact » : un couple rencontré ailleurs que sur le site.
// Fiche sans menu, aucun rappel automatique (la relation est gérée par J&J).
export default function AddContactSheet({ compositions, onClose, onOpen, onCreated }: Props) {
  const [names, setNames] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [guests, setGuests] = useState('')
  const [origin, setOrigin] = useState<ContactOrigin>('telephone')
  const [note, setNote] = useState('')
  const [alreadyCalled, setAlreadyCalled] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicates, setDuplicates] = useState<Composition[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function validate() {
    const found: Record<string, string> = {}
    if (!names.trim()) found.names = 'Indiquez les prénoms.'
    const normalized = normalizePhone(phone)
    if (!normalized) found.phone = 'Numéro de téléphone non reconnu.'
    if (email.trim() && !isValidEmail(email.trim())) found.email = 'Adresse email non valide.'
    const n = guests.trim() ? Number(guests) : null
    if (n != null && (!Number.isInteger(n) || n < 1 || n > 2000)) found.guests = 'Nombre de convives non valide.'
    setErrors(found)
    return Object.keys(found).length === 0 ? { phone: normalized as string, guests: n } : null
  }

  async function submit(e: FormEvent | null, force = false) {
    e?.preventDefault()
    const ok = validate()
    if (!ok) return
    if (!force) {
      const found = findDuplicates(compositions, { phone: ok.phone, email: email.trim() || null })
      if (found.length > 0) return setDuplicates(found)
    }
    setSaving(true)
    setSaveError(null)
    const id = await addContact({
      coupleNames: names.trim(),
      phone: ok.phone,
      email: email.trim() || null,
      weddingDate: date || null,
      guestCount: ok.guests,
      origin,
      note: note.trim() || null,
      alreadyCalled,
    })
    setSaving(false)
    if (!id) return setSaveError('Le contact n’a pas pu être enregistré. Vérifiez la connexion et réessayez.')
    onCreated()
    onOpen(id)
  }

  const field = 'flex flex-col gap-1.5'
  const label = 'text-base font-medium text-ink'
  const err = (k: string) => errors[k] && <span className="text-base text-error">{errors[k]}</span>

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ajout-titre">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-card bg-fond p-5 pb-8 shadow-xl sm:rounded-card">
        <div className="flex items-center justify-between">
          <h2 id="ajout-titre" className="font-display text-xl text-slate">
            Ajouter un contact
          </h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 text-2xl text-muted" aria-label="Fermer">
            ×
          </button>
        </div>

        {duplicates ? (
          <div className="mt-4">
            <p className="text-base font-bold text-ink">Ce contact existe déjà</p>
            <p className="mt-1 text-base text-muted">Même téléphone ou même email :</p>
            <ul className="mt-3 flex flex-col gap-2">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(d.id)}
                    className="min-h-12 w-full rounded-card border border-lin px-3 py-2 text-left text-base text-ink hover:border-slate"
                  >
                    <strong>{d.couple_names || 'Sans prénoms'}</strong>
                    <span className="block text-muted">
                      {d.status === 'draft' ? 'Menu commencé' : isWithoutMenu(d) ? 'Contact, pas encore de menu' : 'Menu envoyé'}
                      {d.wedding_date ? ` · ${formatDate(d.wedding_date)}` : ''} · voir la fiche →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => submit(null, true)}
                className="min-h-12 rounded-card border border-slate text-base font-bold text-slate disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Ajouter quand même'}
              </button>
              <button type="button" onClick={() => setDuplicates(null)} className="min-h-11 text-base text-muted underline">
                Revenir au formulaire
              </button>
            </div>
            {saveError && <p className="mt-2 text-base text-error">{saveError}</p>}
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
            <label className={field}>
              <span className={label}>Prénoms *</span>
              <input className="input" value={names} onChange={(e) => setNames(e.target.value)} placeholder="Camille & Alex" maxLength={120} />
              {err('names')}
            </label>
            <label className={field}>
              <span className={label}>Téléphone *</span>
              <input className="input" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
              {err('phone')}
            </label>
            <label className={field}>
              <span className={label}>Email (facultatif)</span>
              <input className="input" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
              {err('email')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={field}>
                <span className={label}>Date du mariage</span>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className={field}>
                <span className={label}>Convives</span>
                <input className="input" type="number" inputMode="numeric" min={1} max={2000} value={guests} onChange={(e) => setGuests(e.target.value)} />
                {err('guests')}
              </label>
            </div>
            <label className={field}>
              <span className={label}>Comment nous a-t-il connus ?</span>
              <select className="input" value={origin} onChange={(e) => setOrigin(e.target.value as ContactOrigin)}>
                {CONTACT_ORIGINS.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className={label}>Note</span>
              <textarea className="input resize-y" rows={3} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Appel du 12/10 : château de…, plutôt cocktail" />
            </label>
            <label className="flex min-h-11 items-center gap-3 text-base text-ink">
              <input type="checkbox" className="h-6 w-6" checked={alreadyCalled} onChange={(e) => setAlreadyCalled(e.target.checked)} />
              Déjà appelé
            </label>
            {saveError && <p className="text-base text-error">{saveError}</p>}
            <button type="submit" disabled={saving} className="min-h-12 rounded-card bg-slate text-base font-bold text-lin hover:bg-slate-deep disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Enregistrer le contact'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

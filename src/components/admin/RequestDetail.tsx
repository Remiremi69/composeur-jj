import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  Composition,
  CompositionItem,
  CompositionNote,
  CompositionOption,
  CrmStatus,
  Formule,
  Item,
  LostReason,
  Option,
  Selections,
  Step,
} from '../../types/db'
import { computeEstimate, type Estimate } from '../../lib/pricing'
import { formatDate, formatPhone, formatPrice, formatTotal, optionPriceLabel } from '../../lib/format'
import {
  CRM_STATUSES,
  CRM_STATUS_LABELS,
  LOST_REASONS,
  LOST_REASON_LABELS,
  receivedAt,
  whatsappHref,
} from '../../lib/crm'

// Provenance lisible : source + paramètres utm utiles.
function provenance(c: Composition): string | null {
  const p = c.landing_params ?? {}
  const details = [p.utm_medium, p.utm_campaign].filter(Boolean).join(' · ')
  if (!c.source && !details) return null
  return [c.source, details].filter(Boolean).join(' — ')
}

function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

interface RequestDetailProps {
  composition: Composition
  compItems: CompositionItem[]
  compOptions: CompositionOption[]
  steps: Step[]
  items: Item[]
  options: Option[]
  formules: Formule[]
  onBack: () => void
  onChanged: () => void // recharger les données après une modification
}

export default function RequestDetail({
  composition: c,
  compItems,
  compOptions,
  steps,
  items,
  options,
  formules,
  onBack,
  onChanged,
}: RequestDetailProps) {
  const formule = formules.find((f) => f.id === c.formule_id) ?? null

  const selections: Selections = {}
  for (const ci of compItems) if (ci.composition_id === c.id) selections[ci.item_id] = ci.quantity
  const chosenOptionIds = compOptions.filter((co) => co.composition_id === c.id).map((co) => co.option_id)
  const chosenOptions = options.filter((o) => chosenOptionIds.includes(o.id))

  // Détail du prix : figé à l'envoi (lot 5) ; sinon recalculé aux prix actuels.
  const frozen = c.estimate
  const estimate: Estimate =
    frozen ?? computeEstimate(formule, items, selections, options, chosenOptionIds, c.guest_count ?? 0)

  // ------------------------------------------------ notes et historique
  const [notes, setNotes] = useState<CompositionNote[]>([])
  const [notesError, setNotesError] = useState<string | null>(null)
  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('composition_notes')
      .select('*')
      .eq('composition_id', c.id)
      .order('created_at', { ascending: false })
    if (error) setNotesError('Impossible de charger l’historique.')
    else {
      setNotesError(null)
      setNotes(data ?? [])
    }
  }, [c.id])
  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // ------------------------------------------------ statut
  const [pendingStatus, setPendingStatus] = useState<CrmStatus | null>(null) // « perdu » en attente de motif
  const [reason, setReason] = useState<LostReason | ''>('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function saveStatus(status: CrmStatus, lostReason: LostReason | null) {
    setSaving(true)
    setActionError(null)
    const { error } = await supabase
      .from('compositions')
      .update({ crm_status: status, lost_reason: lostReason })
      .eq('id', c.id)
    setSaving(false)
    if (error) return setActionError('Le statut n’a pas pu être enregistré. Réessayez.')
    setPendingStatus(null)
    setReason('')
    onChanged()
    loadNotes()
  }

  function onStatusChange(status: CrmStatus) {
    if (status === c.crm_status) return setPendingStatus(null)
    if (status === 'perdu') return setPendingStatus('perdu') // demande le motif
    saveStatus(status, null)
  }

  async function toggleTest() {
    setActionError(null)
    const { error } = await supabase.from('compositions').update({ is_test: !c.is_test }).eq('id', c.id)
    if (error) return setActionError('La modification n’a pas pu être enregistrée.')
    onChanged()
  }

  // ------------------------------------------------ nouvelle note
  const [draft, setDraft] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  async function addNote(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('composition_notes').insert({
      composition_id: c.id,
      kind: 'note',
      body,
      author_id: auth.user?.id,
      author_email: auth.user?.email ?? null,
    })
    if (error) return setNoteError('La note n’a pas pu être enregistrée.')
    setNoteError(null)
    setDraft('')
    loadNotes()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" onClick={onBack} className="mb-6 text-sm font-medium text-muted hover:text-ink">
        ← Retour aux demandes
      </button>

      {/* ------------------------------------------------ En-tête */}
      <div className="rounded-card border border-lin bg-fond p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-slate">
              {c.couple_names}
              {c.is_test && (
                <span className="ml-2 rounded-card border border-lin px-1.5 py-0.5 align-middle font-body text-xs text-muted">
                  test
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {c.wedding_date ? formatDate(c.wedding_date) : 'Date non précisée'} · {c.guest_count} convives
              {formule ? ` · ${formule.name}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted">
              Reçu le {dateTime(receivedAt(c))}
              {c.contacted_at ? ` · premier contact le ${dateTime(c.contacted_at)}` : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              Statut
              <select
                value={pendingStatus ?? c.crm_status}
                disabled={saving}
                onChange={(e) => onStatusChange(e.target.value as CrmStatus)}
                className="rounded-card border border-slate bg-fond px-2 py-1.5 font-bold text-slate"
              >
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CRM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            {c.crm_status === 'perdu' && c.lost_reason && !pendingStatus && (
              <p className="text-xs text-muted">Motif : {LOST_REASON_LABELS[c.lost_reason]}</p>
            )}
            <button type="button" onClick={toggleTest} className="text-xs text-muted underline underline-offset-2 hover:text-ink">
              {c.is_test ? 'Retirer des tests' : 'Marquer comme test'}
            </button>
          </div>
        </div>

        {/* Motif de perte, demandé avant d'enregistrer « Perdu » */}
        {pendingStatus === 'perdu' && (
          <div className="mt-4 rounded-card border border-lin bg-lin-light p-4">
            <p className="text-sm font-bold text-ink">Pourquoi cette demande est-elle perdue ?</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {LOST_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm text-ink">
                  <input type="radio" name="motif" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {LOST_REASON_LABELS[r]}
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                disabled={!reason || saving}
                onClick={() => reason && saveStatus('perdu', reason)}
                className="rounded-card bg-slate px-4 py-2 text-sm font-bold text-lin hover:bg-slate-deep disabled:opacity-40"
              >
                Marquer comme perdue
              </button>
              <button type="button" onClick={() => setPendingStatus(null)} className="text-sm text-muted hover:text-ink">
                Annuler
              </button>
            </div>
          </div>
        )}
        {actionError && <p className="mt-3 text-sm text-error">{actionError}</p>}

        {/* ------------------------------------------------ Contact */}
        <div className="mt-5 flex flex-wrap gap-2">
          {c.phone && (
            <>
              <a
                href={`tel:${c.phone}`}
                className="rounded-card bg-slate px-4 py-2 text-sm font-bold text-lin hover:bg-slate-deep"
              >
                Appeler · {formatPhone(c.phone)}
              </a>
              <a
                href={whatsappHref(c.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-card border border-slate px-4 py-2 text-sm font-bold text-slate hover:bg-lin-light"
              >
                WhatsApp
              </a>
            </>
          )}
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="rounded-card border border-slate px-4 py-2 text-sm font-bold text-slate hover:bg-lin-light"
            >
              {c.email}
            </a>
          )}
          <a
            href={`/menu/${c.share_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-card border border-lin px-4 py-2 text-sm text-ink hover:border-slate"
          >
            Voir le menu en ligne ↗
          </a>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Lieu" value={c.venue || '—'} />
          <Row label="Provenance" value={provenance(c) ?? '—'} />
        </dl>
        <div className="mt-4 flex flex-col gap-3 border-t border-lin pt-4 text-sm">
          <Block label="Allergies et régimes" text={c.dietary_notes} />
          <Block label="Message" text={c.message} />
        </div>
      </div>

      {/* ------------------------------------------------ Prix */}
      <div className="mt-6 rounded-card border border-lin bg-fond p-6">
        <h2 className="font-display text-lg text-slate">Estimation</h2>
        {!frozen && (
          <p className="mt-1 text-xs text-muted">
            Recalculé aux prix actuels (demande antérieure à l’enregistrement du détail).
            {c.total_estimate != null && ` Total envoyé au couple : ${formatTotal(c.total_estimate)}.`}
          </p>
        )}
        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          <Row label={`Formule${formule ? ` ${formule.name}` : ''}`} value={`${formatPrice(estimate.basePerPerson)} / pers`} />
          <Row label="Suppléments" value={`${formatPrice(estimate.supplementsPerPerson)} / pers`} />
          <Row label="Options par personne" value={`${formatPrice(estimate.optionsPerPerson)} / pers`} />
          <Row label="Options au forfait" value={formatTotal(estimate.forfaitOptions)} />
        </dl>
        <p className="mt-4 border-t border-lin pt-3 text-ink">
          <span className="font-display text-2xl text-slate">{formatPrice(estimate.perPersonAllIn)}</span>{' '}
          <span className="text-sm text-muted">par personne, tout compris</span>
          <span className="ml-3 text-sm">· Total {formatTotal(estimate.total)}</span>
        </p>
      </div>

      {/* ------------------------------------------------ Menu */}
      <div className="mt-6 rounded-card border border-lin bg-fond p-6">
        <h2 className="font-display text-lg text-slate">Le menu choisi</h2>
        <div className="mt-4 flex flex-col gap-5">
          {steps.map((step) => {
            const stepItems = items
              .filter((it) => it.step_id === step.id && selections[it.id])
              .sort((a, b) => a.position - b.position)
            if (stepItems.length === 0) return null
            return (
              <section key={step.id}>
                <h3 className="text-xs uppercase tracking-[0.15em] text-muted">{step.title}</h3>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {stepItems.map((it) => (
                    <li key={it.id} className="text-ink">
                      {it.name}
                      {selections[it.id] > 1 && <span className="text-muted"> × {selections[it.id]}</span>}
                      {it.supplement > 0 && <span className="text-muted"> · + {formatPrice(it.supplement)}/pers</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {chosenOptions.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-muted">Options</h3>
              <ul className="mt-1.5 flex flex-col gap-1">
                {chosenOptions.map((o) => (
                  <li key={o.id} className="text-ink">
                    {o.name}
                    <span className="text-muted"> · {optionPriceLabel(o)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ Notes et historique */}
      <div className="mt-6 rounded-card border border-lin bg-fond p-6">
        <h2 className="font-display text-lg text-slate">Notes internes et historique</h2>
        <form onSubmit={addNote} className="mt-3 flex flex-col gap-2">
          <label htmlFor="nouvelle-note" className="sr-only">
            Nouvelle note
          </label>
          <textarea
            id="nouvelle-note"
            rows={3}
            maxLength={5000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Appel du 12/10 : rappeler après leur visite du domaine…"
            className="input resize-y"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-card bg-slate px-4 py-2 text-sm font-bold text-lin hover:bg-slate-deep disabled:opacity-40"
            >
              Ajouter la note
            </button>
            {noteError && <span className="text-sm text-error">{noteError}</span>}
          </div>
        </form>

        {notesError && <p className="mt-4 text-sm text-error">{notesError}</p>}
        <ol className="mt-5 flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-lin pl-3 text-sm">
              <p className="text-xs text-muted">
                {dateTime(n.created_at)}
                {n.author_email ? ` · ${n.author_email}` : ''}
              </p>
              {n.kind === 'statut' ? (
                <p className="text-ink">
                  Statut : {n.from_status ? CRM_STATUS_LABELS[n.from_status] : '—'} →{' '}
                  <strong>{n.to_status ? CRM_STATUS_LABELS[n.to_status] : '—'}</strong>
                  {n.to_status === 'perdu' && n.body && ` (${LOST_REASON_LABELS[n.body as LostReason] ?? n.body})`}
                </p>
              ) : (
                <p className="whitespace-pre-line text-ink">{n.body}</p>
              )}
            </li>
          ))}
          {notes.length === 0 && !notesError && <li className="text-sm text-muted">Aucune note pour le moment.</li>}
        </ol>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label} :</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

function Block({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <p className="text-muted">{label} :</p>
      <p className="whitespace-pre-line text-ink">{text?.trim() ? text : '—'}</p>
    </div>
  )
}

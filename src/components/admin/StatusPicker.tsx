import { useState } from 'react'
import type { Composition, CrmStatus, LostReason } from '../../types/db'
import { CRM_STATUSES, CRM_STATUS_LABELS, LOST_REASONS, LOST_REASON_LABELS } from '../../lib/crm'
import { updateCrmStatus } from '../../lib/adminActions'

// Menu de statut en mots simples. « Perdu » demande d'abord le motif.
export default function StatusPicker({ composition: c, onChanged }: { composition: Composition; onChanged: () => void }) {
  const [askReason, setAskReason] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(status: CrmStatus, reason: LostReason | null) {
    setSaving(true)
    setError(null)
    const ok = await updateCrmStatus(c.id, status, reason)
    setSaving(false)
    if (!ok) return setError('Le statut n’a pas pu être enregistré. Réessayez.')
    setAskReason(false)
    onChanged()
  }

  function onChange(status: CrmStatus) {
    if (status === c.crm_status) return setAskReason(false)
    if (status === 'perdu') return setAskReason(true)
    void save(status, null)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="sr-only">Statut de la demande</span>
        <select
          value={askReason ? 'perdu' : c.crm_status}
          disabled={saving}
          onChange={(e) => onChange(e.target.value as CrmStatus)}
          className="min-h-11 w-full rounded-card border border-slate bg-fond px-3 text-base font-bold text-slate"
        >
          {CRM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CRM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {askReason && (
        <div className="rounded-card border border-lin bg-lin-light p-3">
          <p className="font-bold text-ink">Pourquoi est-ce perdu ?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {LOST_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={saving}
                onClick={() => save('perdu', r)}
                className="min-h-11 rounded-card border border-slate bg-fond px-2 text-base text-slate hover:bg-lin disabled:opacity-50"
              >
                {LOST_REASON_LABELS[r]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAskReason(false)} className="mt-2 min-h-11 text-base text-muted underline">
            Annuler
          </button>
        </div>
      )}
      {c.crm_status === 'perdu' && c.lost_reason && !askReason && (
        <p className="text-base text-muted">Motif : {LOST_REASON_LABELS[c.lost_reason]}</p>
      )}
      {error && <p className="text-base text-error">{error}</p>}
    </div>
  )
}

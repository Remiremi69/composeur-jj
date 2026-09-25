import { useId } from 'react'
import type { ReactNode } from 'react'

export interface FieldA11y {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
}

// Champ de formulaire accessible : libellé, aide, erreur SOUS le champ (en
// rouge accessible, reliée par aria-describedby) et avertissement non
// bloquant. Le contrôle reçoit ses attributs via `children(a11y)`.
export default function FormField({
  label,
  required,
  optional,
  hint,
  error,
  warning,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  hint?: ReactNode
  error?: string
  warning?: ReactNode
  children: (a11y: FieldA11y) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-aide`
  const errorId = `${id}-erreur`
  const warningId = `${id}-avertissement`
  const describedBy = [hint && hintId, error && errorId, warning && warningId].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-accent"> *</span>}
        {optional && <span className="font-normal text-muted"> (facultatif)</span>}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-sm text-error">
          {error}
        </span>
      )}
      {warning && (
        <span id={warningId} className="text-sm text-ink">
          {warning}
        </span>
      )}
    </div>
  )
}

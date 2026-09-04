'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { submitReportFormAction, type FillField, type FormSubmitState } from '@/lib/actions/forms'
import { FieldControl, type FieldValue } from './FieldControl'

import styles from './FillForm.module.scss'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? 'Submitting…' : label}
    </button>
  )
}

type Props = {
  fields: FillField[]
  tenantSlug: string
  formId: number
  submitLabel?: string
}

/** The initial answer snapshot applies each field's authored default. */
function defaultsFor(fields: FillField[]): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const field of fields) {
    if (field.default !== undefined) out[field.key] = field.default
  }
  return out
}

/**
 * Member-facing fill experience for a structured report form. Every control
 * renders through the shared FieldControl so what the Form Studio previews is
 * exactly what a filer fills: label + help + default + sizing, including the
 * live Character picker. Required validation happens again server-side in
 * submitReportFormAction, whose error state renders here.
 */
export function FillForm({ fields, tenantSlug, formId, submitLabel = 'Submit' }: Props) {
  const [state, formAction] = useActionState<FormSubmitState | null, FormData>(
    submitReportFormAction,
    null,
  )
  const [answers, setAnswers] = useState<Record<string, FieldValue>>(() => defaultsFor(fields))
  const change = (key: string) => (value: FieldValue) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  return (
    <form action={formAction} className={styles.wrap}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="formId" value={formId} />

      {state && !state.ok && state.message ? (
        <p className={styles.error} role="alert">
          {state.message}
          {state.missingFields && state.missingFields.length > 0 ? (
            <> Missing: {state.missingFields.join(', ')}.</>
          ) : null}
        </p>
      ) : null}

      {fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          name={field.key}
          domainSlug={tenantSlug}
          value={answers[field.key] ?? ''}
          onValueChange={change(field.key)}
        />
      ))}

      <div className={styles.actions}>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  )
}

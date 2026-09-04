'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { submitReportFormAction, type FillField, type FormSubmitState } from '@/lib/actions/forms'

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

/**
 * Member-facing fill experience for a structured report form. Plain inputs
 * only (the five allowed field types); required validation happens again
 * server-side in submitReportFormAction, whose error state renders here.
 */
export function FillForm({ fields, tenantSlug, formId, submitLabel = 'Submit' }: Props) {
  const [state, formAction] = useActionState<FormSubmitState | null, FormData>(
    submitReportFormAction,
    null,
  )

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

      {fields.map((field) => {
        const inputId = `field-${field.key}`
        return (
          <div key={field.key} className={styles.field}>
            <label htmlFor={inputId} className={styles.label}>
              {field.label}
              {field.required ? <span className={styles.req} aria-hidden="true"> *</span> : null}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={inputId}
                name={field.key}
                className={styles.textarea}
                required={field.required}
                rows={5}
              />
            ) : field.type === 'select' ? (
              <select
                id={inputId}
                name={field.key}
                className={styles.select}
                required={field.required}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose…
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <span className={styles.checkboxRow}>
                <input
                  id={inputId}
                  name={field.key}
                  type="checkbox"
                  className={styles.checkbox}
                  value="yes"
                />
                <span>Yes</span>
              </span>
            ) : (
              <input
                id={inputId}
                name={field.key}
                type={field.type === 'date' ? 'date' : 'text'}
                className={styles.input}
                required={field.required}
              />
            )}
          </div>
        )
      })}

      <div className={styles.actions}>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  )
}

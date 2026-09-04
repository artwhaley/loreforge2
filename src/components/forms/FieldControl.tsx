'use client'

import type { ReactNode } from 'react'

import { CharacterFieldPicker } from '@/components/characters/CharacterFieldPicker'
import type { LoreForgeFormField } from '@/lib/forms/schema'

import styles from './FieldControl.module.scss'

/** A control's value: text, a boolean (checkbox), or chosen Character ids. */
export type FieldValue = string | boolean | string[]

type Props = {
  field: LoreForgeFormField
  /** Native form field name when the parent submits by input names. */
  name?: string
  id?: string
  value: FieldValue | ''
  onValueChange?: (value: FieldValue) => void
  /** Live searchable Character picker needs the Domain slug. */
  domainSlug?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

const widthClass = (width: LoreForgeFormField['width']): string => {
  if (width === 'short') return styles.short
  if (width === 'medium') return styles.medium
  return styles.full
}

/**
 * The one neutral field renderer. The Form Studio canvas, the member fill
 * form, and the records/new template form all render through this component
 * so what an author arranges in the studio is exactly what a filer sees:
 * label + required mark, help text, sized control, and default answer.
 */
export function FieldControl({ field, name, id, value, onValueChange, domainSlug, required, disabled = false, className }: Props) {
  const controlId = id ?? `field-${field.key}`
  const helpId = `${controlId}-help`
  const isRequired = required ?? Boolean(field.required)
  const change = (next: string | boolean | string[]) => { if (!disabled && onValueChange) onValueChange(next) }
  const labelledBy = `${controlId}-label`

  let control: ReactNode
  if (field.type === 'textarea') {
    control = <textarea id={controlId} name={name} rows={field.rows ?? 5} className={styles.textarea} required={isRequired} disabled={disabled} aria-labelledby={labelledBy} aria-describedby={field.help ? helpId : undefined} value={typeof value === 'string' ? value : ''} onChange={(event) => change(event.target.value)} />
  } else if (field.type === 'select') {
    control = (
      <select id={controlId} name={name} className={styles.select} required={isRequired} disabled={disabled} aria-labelledby={labelledBy} aria-describedby={field.help ? helpId : undefined} value={typeof value === 'string' ? value : ''} onChange={(event) => change(event.target.value)}>
        <option value="">Choose…</option>
        {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    )
  } else if (field.type === 'checkbox') {
    control = (
      <span className={styles.checkboxRow}>
        <input id={controlId} name={name} type="checkbox" className={styles.checkbox} disabled={disabled} aria-labelledby={labelledBy} checked={Boolean(value)} onChange={(event) => change(event.target.checked)} />
        <span className={styles.checkboxLabel}>Yes</span>
      </span>
    )
  } else if (field.type === 'character' || field.type === 'characters') {
    const multi = field.type === 'characters'
    control = domainSlug && !disabled
      ? <CharacterFieldPicker multi={multi} domainSlug={domainSlug} value={multi ? (Array.isArray(value) ? value : []) : typeof value === 'string' ? value : ''} onChange={(next) => change(next)} ariaLabel={field.label} name={name} />
      : <input id={controlId} name={name} type="text" className={styles.input} disabled aria-labelledby={labelledBy} aria-describedby={field.help ? helpId : undefined} placeholder={multi ? 'Character picker appears when this form is filled' : 'Character picker appears when this form is filled'} value="" onChange={() => undefined} />
  } else {
    control = <input id={controlId} name={name} type={field.type === 'date' ? 'date' : 'text'} className={styles.input} required={isRequired} disabled={disabled} aria-labelledby={labelledBy} aria-describedby={field.help ? helpId : undefined} value={typeof value === 'string' ? value : ''} onChange={(event) => change(event.target.value)} />
  }

  return (
    <div className={`${styles.field} ${widthClass(field.width)}${className ? ` ${className}` : ''}`} data-field-type={field.type}>
      <span id={labelledBy} className={styles.label}>{field.label || 'Untitled question'}{isRequired ? <span className={styles.req} aria-hidden="true"> *</span> : null}</span>
      {control}
      {field.help ? <span id={helpId} className={styles.help}>{field.help}</span> : null}
    </div>
  )
}

'use client'

import { uniqueKey, slugifyOptionValue } from '@/lib/forms/layout'
import type { FormFieldType, FormOption, LoreForgeFormField } from '@/lib/forms/schema'

import styles from './FormStudio.module.scss'
import { FIELD_TYPE_HINTS, FIELD_TYPE_LABELS, FIELD_TYPES } from './toolbox'

const WIDTHS: Array<{ value: 'short' | 'medium' | 'full'; label: string }> = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'full', label: 'Full width' },
]

const ROW_COUNTS = [3, 4, 5, 6, 7, 8]

type InspectorProps = {
  field: LoreForgeFormField | null
  count: number
  isRecordNamer: boolean
  onPatch: (key: string, patch: Partial<LoreForgeFormField>) => void
  onRemove: (key: string) => void
  onDuplicate: (key: string) => void
}

export function Inspector({ field, count, isRecordNamer, onPatch, onRemove, onDuplicate }: InspectorProps) {
  if (!field) {
    return (
      <aside className={styles.inspector} aria-label="Inspector">
        <div className={styles.inspectorHint}>
          <strong className={styles.inspectorHintTitle}>{count === 0 ? 'Start your form' : 'Select a question'}</strong>
          <p>{count === 0 ? 'Add your first question from the left rail.' : `This form has ${count} question${count === 1 ? '' : 's'}. Click a question on the form to edit it here.`}</p>
        </div>
      </aside>
    )
  }

  const isCharacterType = (type: FormFieldType) => type === 'character' || type === 'characters'

  const changeType = (type: FormFieldType) => {
    const patch: Partial<LoreForgeFormField> = { type }
    if (type !== 'select') patch.options = undefined
    else if (!field.options || field.options.length === 0) patch.options = [{ label: 'First choice', value: 'first_choice' }]
    if (!isCharacterType(type)) patch.relationshipLabel = undefined
    if (type !== 'checkbox' && typeof field.default === 'boolean') patch.default = undefined
    onPatch(field.key, patch)
  }

  const changeOptions = (options: FormOption[]) => onPatch(field.key, { options })
  const setOptionLabel = (value: string, label: string) => changeOptions((field.options ?? []).map((option) => option.value === value ? { ...option, label } : option))
  const addOption = () => {
    const taken = new Set((field.options ?? []).map((option) => option.value))
    const label = ''
    const value = uniqueKey(slugifyOptionValue(label || 'option'), taken)
    changeOptions([...(field.options ?? []), { label, value }])
  }
  const removeOption = (value: string) => changeOptions((field.options ?? []).filter((option) => option.value !== value))
  const moveOption = (index: number, direction: -1 | 1) => {
    const next = [...(field.options ?? [])]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [option] = next.splice(index, 1)
    next.splice(target, 0, option)
    changeOptions(next)
  }

  return (
    <aside className={styles.inspector} aria-label="Question settings">
      <div className={styles.inspectorHeader}>
        <span className={styles.inspectorType}>{FIELD_TYPE_LABELS[field.type]}</span>
        <label className={styles.groupLabel} htmlFor={`type-${field.key}`}>Type</label>
        <select id={`type-${field.key}`} className={styles.select} value={field.type} onChange={(event) => changeType(event.target.value as FormFieldType)}>
          {FIELD_TYPES.map((type) => <option key={type} value={type}>{FIELD_TYPE_LABELS[type]}</option>)}
        </select>
        <p className={styles.muted}>{FIELD_TYPE_HINTS[field.type]}</p>
      </div>

      <div className={styles.group}>
        <label className={styles.groupLabel} htmlFor={`label-${field.key}`}>Question</label>
        <input id={`label-${field.key}`} className={styles.input} value={field.label} placeholder="e.g. What happened?" onChange={(event) => onPatch(field.key, { label: event.target.value })} />
      </div>

      <div className={styles.group}>
        <label className={styles.groupLabel} htmlFor={`help-${field.key}`}>Help text <span className={styles.optional}>(optional)</span></label>
        <input id={`help-${field.key}`} className={styles.input} value={field.help ?? ''} placeholder="Shown under the question to people filling it in" onChange={(event) => onPatch(field.key, { help: event.target.value }) } />
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel} id={`width-${field.key}`}>Width</span>
        <div role="group" aria-labelledby={`width-${field.key}`} className={styles.segmented}>
          {WIDTHS.map((width) => (
            <button key={width.value} type="button" className={styles.segButton} aria-pressed={(field.width ?? 'full') === width.value} onClick={() => onPatch(field.key, { width: width.value })}>
              {width.label}
            </button>
          ))}
        </div>
        <p className={styles.muted}>Short and medium answers sit on one line; full-width questions stretch across the form.</p>
      </div>

      {field.type === 'textarea' ? (
        <div className={styles.group}>
          <label className={styles.groupLabel} htmlFor={`rows-${field.key}`}>Height</label>
          <select id={`rows-${field.key}`} className={styles.select} value={field.rows ?? 5} onChange={(event) => onPatch(field.key, { rows: Number(event.target.value) })}>
            {ROW_COUNTS.map((rows) => <option key={rows} value={rows}>{rows} lines</option>)}
          </select>
        </div>
      ) : null}

      {field.type === 'select' ? (
        <div className={styles.group}>
          <span className={styles.groupLabel} id={`options-${field.key}`}>Choices</span>
          {(field.options ?? []).map((option, index) => (
            <div className={styles.optionRow} key={option.value}>
              <input className={styles.input} value={option.label} placeholder={`Choice ${index + 1}`} aria-label={`Choice ${index + 1} label`} onChange={(event) => setOptionLabel(option.value, event.target.value)} />
              <button type="button" className={styles.iconButton} onClick={() => moveOption(index, -1)} disabled={index === 0} aria-label="Move choice up">↑</button>
              <button type="button" className={styles.iconButton} onClick={() => moveOption(index, 1)} disabled={index === (field.options?.length ?? 0) - 1} aria-label="Move choice down">↓</button>
              <button type="button" className={styles.iconButton} onClick={() => removeOption(option.value)} disabled={(field.options?.length ?? 0) <= 1} aria-label={`Remove choice ${option.label || index + 1}`}>✕</button>
            </div>
          ))}
          <button type="button" className={styles.textButton} onClick={addOption}>+ Add a choice</button>
        </div>
      ) : null}

      {isCharacterType(field.type) ? (
        <div className={styles.group}>
          <label className={styles.groupLabel} htmlFor={`relation-${field.key}`}>Label the relationship <span className={styles.optional}>(optional)</span></label>
          <input id={`relation-${field.key}`} className={styles.input} value={field.relationshipLabel ?? ''} placeholder="e.g. witness" onChange={(event) => onPatch(field.key, { relationshipLabel: event.target.value })} />
          <p className={styles.muted}>{field.type === 'characters' ? 'The record links each of these Characters; the label says what they are to the report.' : 'The record links this Character; the label says what they are to the report.'}</p>
        </div>
      ) : null}

      <div className={styles.group}>
        {field.type === 'checkbox' ? (
          <label className={styles.checkboxLine}>
            <input type="checkbox" checked={field.default === true} onChange={(event) => onPatch(field.key, { default: event.target.checked ? true : undefined })} />
            Ticked by default
          </label>
        ) : !isCharacterType(field.type) && (field.type !== 'select' || (field.options ?? []).length > 0) ? (
          <>
            <label className={styles.groupLabel} htmlFor={`default-${field.key}`}>Default answer <span className={styles.optional}>(optional)</span></label>
            {field.type === 'textarea' ? (
              <textarea id={`default-${field.key}`} className={styles.textarea} rows={2} value={typeof field.default === 'string' ? field.default : ''} placeholder="Prefilled when someone opens the form" onChange={(event) => onPatch(field.key, { default: event.target.value }) } />
            ) : field.type === 'select' ? (
              <select id={`default-${field.key}`} className={styles.select} value={typeof field.default === 'string' ? field.default : ''} onChange={(event) => onPatch(field.key, { default: event.target.value || undefined })}>
                <option value="">No default</option>
                {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label || option.value}</option>)}
              </select>
            ) : (
              <input id={`default-${field.key}`} className={styles.input} type={field.type === 'date' ? 'date' : 'text'} value={typeof field.default === 'string' ? field.default : ''} placeholder="Prefilled when someone opens the form" onChange={(event) => onPatch(field.key, { default: event.target.value }) } />
            )}
          </>
        ) : null}
      </div>

      <div className={styles.group}>
        <label className={styles.checkboxLine}>
          <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => onPatch(field.key, { required: event.target.checked })} />
          Required — filers must answer
        </label>
      </div>

      <div className={styles.groupRow}>
        <button type="button" className={styles.textButton} onClick={() => onDuplicate(field.key)}>Duplicate question</button>
        {isRecordNamer ? <span className={styles.recordNamerNote}>Names each record</span> : null}
      </div>
      <button type="button" className={styles.dangerButton} onClick={() => onRemove(field.key)}>Remove question</button>
    </aside>
  )
}

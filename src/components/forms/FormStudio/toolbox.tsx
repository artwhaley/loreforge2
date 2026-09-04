'use client'

import { useDraggable } from '@dnd-kit/core'

import type { FormFieldType } from '@/lib/forms/schema'

import styles from './FormStudio.module.scss'

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short answer',
  textarea: 'Long answer',
  date: 'Date',
  time: 'Time',
  select: 'Choice list',
  checkbox: 'Checkbox',
  character: 'Pick a Character',
  characters: 'Pick Characters',
}

export const FIELD_TYPE_HINTS: Record<FormFieldType, string> = {
  text: 'A brief line of text',
  textarea: 'Several lines of text',
  date: 'A calendar date',
  time: 'A time of day',
  select: 'Choose from options you write',
  checkbox: 'A box the filer ticks',
  character: 'Choose one active Character in this Domain',
  characters: 'Choose several active Characters in this Domain',
}

export const FIELD_TYPES: FormFieldType[] = ['text', 'textarea', 'date', 'time', 'select', 'checkbox', 'character', 'characters']

type ToolboxProps = {
  onAdd: (type: FormFieldType) => void
}

function Tile({ type, onAdd }: { type: FormFieldType; onAdd: (type: FormFieldType) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tile-${type}`,
    data: { kind: 'tile', fieldType: type },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.tile}${isDragging ? ` ${styles.tileDragging}` : ''}`}
      role="button"
      aria-label={`${FIELD_TYPE_LABELS[type]} — drag to add, or press the add button`}
    >
      <strong>{FIELD_TYPE_LABELS[type]}</strong>
      <small>{FIELD_TYPE_HINTS[type]}</small>
      <button type="button" className={styles.tileAdd} onClick={() => onAdd(type)} aria-label={`Add ${FIELD_TYPE_LABELS[type].toLowerCase()}`} onPointerDown={(event) => event.stopPropagation()}>
        Add
      </button>
    </div>
  )
}

/** Left rail: drag a question type into the canvas or add it with a click. */
export function Toolbox({ onAdd }: ToolboxProps) {
  return (
    <aside className={styles.toolbox} aria-label="Question types">
      <h2 className={styles.toolboxHeading}>Add a question</h2>
      <p className={styles.toolboxHint}>Drag one onto the form, or add it with the button. You can reorder questions later.</p>
      <div className={styles.toolboxList}>
        {FIELD_TYPES.map((type) => <Tile key={type} type={type} onAdd={onAdd} />)}
      </div>
    </aside>
  )
}

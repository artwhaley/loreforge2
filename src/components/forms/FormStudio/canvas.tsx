'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { FieldControl, type FieldValue } from '@/components/forms/FieldControl'
import type { LoreForgeFormField } from '@/lib/forms/schema'

import styles from './FormStudio.module.scss'
import { FIELD_TYPE_LABELS } from './toolbox'

function canvasValue(field: LoreForgeFormField): FieldValue | '' {
  if (field.default !== undefined) {
    if (field.type === 'checkbox') return typeof field.default === 'boolean' ? field.default : field.default === 'true'
    return String(field.default)
  }
  return field.type === 'checkbox' ? false : ''
}

type CanvasRowProps = {
  field: LoreForgeFormField
  index: number
  total: number
  selected: boolean
  onSelect: (key: string) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (key: string) => void
}

function CanvasRow({ field, index, total, selected, onSelect, onMove, onRemove }: CanvasRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: `row-${field.key}`, data: { kind: 'row', fieldKey: field.key } })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const title = field.label || FIELD_TYPE_LABELS[field.type]
  return (
    <div ref={setNodeRef} style={style} className={`${styles.canvasRow}${selected ? ` ${styles.rowSelected}` : ''}${isDragging ? ` ${styles.rowDragging}` : ''}`} data-selected={selected || undefined}>
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className={styles.dragHandle} aria-label={`Reorder ${title}`} title="Drag to reorder">⠿</button>
      <div
        className={styles.canvasControl}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Edit question: ${title}`}
        onClick={() => onSelect(field.key)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(field.key) } }}
      >
        <FieldControl field={field} disabled value={canvasValue(field)} />
      </div>
      <div className={styles.rowActions} aria-label={`Actions for ${title}`}>
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`Move ${title} up`} title="Move up">↑</button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} aria-label={`Move ${title} down`} title="Move down">↓</button>
        <button type="button" className={styles.removeButton} onClick={() => onRemove(field.key)} aria-label={`Remove ${title}`} title="Remove question">✕</button>
      </div>
    </div>
  )
}

type CanvasProps = {
  fields: LoreForgeFormField[]
  selectedKey: string | null
  onSelect: (key: string) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (key: string) => void
}

/** Center pane: the questions in order, rendered exactly as filers will see them. */
export function Canvas({ fields, selectedKey, onSelect, onMove, onRemove }: CanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'form-canvas' })
  const empty = fields.length === 0
  return (
    <div
      ref={setNodeRef}
      className={`${styles.canvas}${isOver ? ` ${styles.canvasOver}` : ''}${empty ? ` ${styles.canvasEmpty}` : ''}`}
      aria-label="Form questions"
    >
      {empty ? (
        <p className={styles.canvasEmptyText}>Your form is empty.<br />Drag a question from the left, or use its Add button.</p>
      ) : (
        <SortableContext items={fields.map((field) => `row-${field.key}`)} strategy={verticalListSortingStrategy}>
          {fields.map((field, index) => (
            <CanvasRow key={field.key} field={field} index={index} total={fields.length} selected={selectedKey === field.key} onSelect={onSelect} onMove={onMove} onRemove={onRemove} />
          ))}
        </SortableContext>
      )}
    </div>
  )
}

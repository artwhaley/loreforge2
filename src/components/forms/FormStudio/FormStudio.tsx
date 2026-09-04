'use client'

import { useEffect, useMemo, useReducer, useState } from 'react'
import { useActionState } from 'react'
import { DndContext, PointerSensor, closestCenter, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'

import { createFormTemplateAction, updateFormTemplateAction, type TemplateActionState } from '@/lib/actions/templates'
import { slugifyLabel, uniqueKey, recordNameCandidates } from '@/lib/forms/layout'
import type { FormFieldType, LoreForgeFormField, LoreForgeFormSchema } from '@/lib/forms/schema'

import styles from './FormStudio.module.scss'
import { Canvas } from './canvas'
import { Inspector } from './inspector'
import { RecordPreview } from './recordPreview'
import { FIELD_TYPE_LABELS, Toolbox } from './toolbox'

export type FolderOption = { id: number; name: string; parentId?: number | null }
export type TypeOption = { id: number; name: string }
export type BaseTemplateOption = { id: number; name: string; scopeFolderId: number; availableToDescendants: boolean }
export type StudioFormInitial = {
  name: string
  documentTypeId: number | string
  scopeFolderId: number | string
  destinationFolderId: number | string
  baseTemplateId: number | string
  recordNameKey: string | null
  fields: LoreForgeFormField[]
}

type FormStudioProps = {
  domainSlug: string
  folders: FolderOption[]
  types: TypeOption[]
  baseTemplates?: BaseTemplateOption[]
  mode: 'create' | 'edit'
  templateId?: number
  initial?: StudioFormInitial
}

const emptySchema = (): LoreForgeFormSchema => ({ version: 1, fields: [] })

function newField(type: FormFieldType, taken: ReadonlySet<string>): LoreForgeFormField {
  const key = uniqueKey(slugifyLabel(FIELD_TYPE_LABELS[type]) || 'field', taken)
  return {
    key,
    type,
    label: '',
    ...(type === 'select' ? { options: [{ label: 'First choice', value: 'first_choice' }] } : {}),
  }
}

function initialDetails(initial?: StudioFormInitial) {
  return {
    name: initial?.name ?? '',
    documentTypeId: String(initial?.documentTypeId ?? ''),
    scopeFolderId: String(initial?.scopeFolderId ?? ''),
    destinationFolderId: String(initial?.destinationFolderId ?? ''),
    baseTemplateId: String(initial?.baseTemplateId ?? ''),
  }
}

export function FormStudio({ domainSlug, folders, types, baseTemplates = [], mode, templateId, initial }: FormStudioProps) {
  const action = mode === 'edit' ? updateFormTemplateAction : createFormTemplateAction
  const [state, formAction, pending] = useActionState<TemplateActionState, FormData>(action, {})
  const [details, setDetails] = useState(() => initialDetails(initial))
  const [fields, setFields] = useState<LoreForgeFormField[]>(() => initial?.fields ?? [])
  const [recordNameKey, setRecordNameKey] = useState<string | null>(initial?.recordNameKey ?? null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [view, setView] = useState<'questions' | 'record'>('questions')
  const [dirty, setDirty] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setDetail = (key: keyof ReturnType<typeof initialDetails>, value: string) => {
    setDetails((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  const patch = (key: string, patchValue: Partial<LoreForgeFormField>) => {
    setFields((current) => current.map((field) => field.key === key ? { ...field, ...patchValue } : field))
    setDirty(true)
  }

  const addField = (type: FormFieldType, atIndex?: number) => {
    setFields((current) => {
      const field = newField(type, new Set(current.map((item) => item.key)))
      const next = [...current]
      const index = atIndex === undefined || atIndex > next.length ? next.length : Math.max(0, atIndex)
      next.splice(index, 0, field)
      return next
    })
    setDirty(true)
    setSelectedKey(null)
  }

  const move = (index: number, direction: -1 | 1) => {
    setFields((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      return arrayMove(current, index, target)
    })
    setDirty(true)
  }

  const moveByKey = (activeKey: string, overKey: string) => {
    setFields((current) => {
      const from = current.findIndex((field) => field.key === activeKey)
      const to = current.findIndex((field) => field.key === overKey)
      if (from < 0 || to < 0 || from === to) return current
      return arrayMove(current, from, to)
    })
    setDirty(true)
  }

  const removeField = (key: string) => {
    const field = fields.find((item) => item.key === key)
    const title = field?.label?.trim() || (field ? FIELD_TYPE_LABELS[field.type] : '')
    if (field && isRecordNamer(field.key) && !window.confirm(`“${title}” currently names each record made from this form. Removing it means the next short/long/date/choice question names records instead. Remove it anyway?`)) return
    setFields((current) => current.filter((item) => item.key !== key))
    setSelectedKey((current) => current === key ? null : current)
    setDirty(true)
  }

  const duplicateField = (key: string) => {
    setFields((current) => {
      const index = current.findIndex((field) => field.key === key)
      if (index < 0) return current
      const source = current[index]
      const copy: LoreForgeFormField = { ...source, key: uniqueKey(slugifyLabel(source.label || FIELD_TYPE_LABELS[source.type]) || 'field', new Set(current.map((item) => item.key))) }
      const next = [...current]
      next.splice(index + 1, 0, copy)
      return next
    })
    setDirty(true)
  }

  // The naming question follows the questions; a stale pinned choice falls back.
  const namingCandidates = useMemo(() => recordNameCandidates(fields), [fields])
  const effectiveNamerKey = useMemo(() => {
    if (!namingCandidates.length) return null
    return namingCandidates.some((field) => field.key === recordNameKey) ? recordNameKey : namingCandidates[0].key
  }, [namingCandidates, recordNameKey])

  const isRecordNamer = (key: string) => effectiveNamerKey === key

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (active.data.current?.kind === 'tile' && (overId === 'form-canvas' || overId.startsWith('row-'))) {
      const overIndex = fields.findIndex((field) => `row-${field.key}` === overId)
      addField(active.data.current.fieldType as FormFieldType, overIndex < 0 ? fields.length : overIndex + 1)
      return
    }
    if (activeId.startsWith('row-') && overId.startsWith('row-')) {
      const activeKey = activeId.replace('row-', '')
      const overKey = overId.replace('row-', '')
      if (activeKey !== overKey) moveByKey(activeKey, overKey)
    }
  }

  // Availability of base templates mirrors the collection rule: a base must
  // apply at the chosen availability folder (or a descendant of its scope).
  const availableBaseTemplates = useMemo(() => {
    const selected = Number(details.scopeFolderId)
    if (!selected) return []
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    return baseTemplates.filter((template) => {
      if (template.scopeFolderId === selected) return true
      if (!template.availableToDescendants) return false
      const seen = new Set<number>()
      let cursor = byId.get(selected)
      while (cursor?.parentId != null && !seen.has(cursor.id)) {
        seen.add(cursor.id)
        if (cursor.parentId === template.scopeFolderId) return true
        cursor = byId.get(cursor.parentId)
      }
      return false
    })
  }, [baseTemplates, folders, details.scopeFolderId])

  const effectiveBaseTemplateId = availableBaseTemplates.some((template) => String(template.id) === details.baseTemplateId) ? details.baseTemplateId : ''

  const schema: LoreForgeFormSchema = useMemo(() => ({ version: 1, fields }), [fields])
  const missingLabels = fields.filter((field) => !field.label.trim()).length
  const canSave = !pending && fields.length > 0 && missingLabels === 0
  const saveLabel = pending ? (mode === 'edit' ? 'Saving…' : 'Saving…') : mode === 'edit' ? 'Save changes' : 'Save form'
  const selectedField = fields.find((field) => field.key === selectedKey) ?? null
  const baseName = availableBaseTemplates.find((template) => String(template.id) === details.baseTemplateId)?.name ?? null

  return (
    <form action={formAction} className={styles.studio} data-mode={mode}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <input type="hidden" name="domainSlug" value={domainSlug} />
      {mode === 'edit' && templateId ? <input type="hidden" name="templateId" value={templateId} /> : null}
      <input type="hidden" name="formSchema" value={JSON.stringify(schema)} />
      <input type="hidden" name="recordNameFieldKey" value={recordNameKey ?? ''} />

      {state.error ? <p role="alert" className={styles.errorBanner}>{state.error}</p> : null}

      <section className={styles.details} aria-label="Form details">
        <div className={styles.detailField}>
          <label className={styles.groupLabel} htmlFor="form-name">Form name</label>
          <input id="form-name" name="name" className={styles.input} required placeholder="e.g. General Incident Report" value={details.name} onChange={(event) => setDetail('name', event.target.value)} />
        </div>
        <div className={styles.detailField}>
          <label className={styles.groupLabel} htmlFor="doc-type">Document Type</label>
          <select id="doc-type" name="documentTypeId" className={styles.select} required value={details.documentTypeId} onChange={(event) => setDetail('documentTypeId', event.target.value)}>
            <option value="">Choose a type</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </div>
        <div className={styles.detailField}>
          <label className={styles.groupLabel} htmlFor="available-from">Available from</label>
          <select id="available-from" name="scopeFolderId" className={styles.select} required value={details.scopeFolderId} onChange={(event) => setDetail('scopeFolderId', event.target.value)}>
            <option value="">Choose a Folder</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </div>
        <div className={styles.detailField}>
          <label className={styles.groupLabel} htmlFor="destination">Normal destination</label>
          <select id="destination" name="destinationFolderId" className={styles.select} required value={details.destinationFolderId} onChange={(event) => setDetail('destinationFolderId', event.target.value)}>
            <option value="">Choose a Folder</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </div>
        <div className={styles.detailField}>
          <label className={styles.groupLabel} htmlFor="base-template">Base template <span className={styles.optional}>(optional)</span></label>
          <select id="base-template" name="baseTemplateId" className={styles.select} value={effectiveBaseTemplateId} onChange={(event) => setDetail('baseTemplateId', event.target.value)}>
            <option value="">No base template</option>
            {availableBaseTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <p className={styles.muted}>{details.scopeFolderId ? 'Only Templates available in the chosen Folder are listed.' : 'Choose an availability Folder first.'}</p>
        </div>
        <div className={styles.detailField}>
          <label className={styles.groupLabel} htmlFor="record-name">Name each record by the answer to</label>
          {namingCandidates.length > 0 ? (
            <select id="record-name" className={styles.select} value={namingCandidates.some((field) => field.key === recordNameKey) ? recordNameKey ?? '' : ''} onChange={(event) => setRecordNameKey(event.target.value || null)}>
              <option value="">Automatic — first naming question</option>
              {namingCandidates.map((field) => <option key={field.key} value={field.key}>{field.label?.trim() || `Question (${FIELD_TYPE_LABELS[field.type].toLowerCase()})`}</option>)}
            </select>
          ) : (
            <p className={styles.muted}>Add a short/long answer, date, or choice question and the form name will be used until then.</p>
          )}
          <p className={styles.muted}>Records are named by this answer automatically; nobody writes titles by hand.</p>
        </div>
      </section>

      <div className={styles.viewBar} role="group" aria-label="Studio view">
        <button type="button" className={styles.viewButton} aria-pressed={view === 'questions'} onClick={() => setView('questions')}>Questions</button>
        <button type="button" className={styles.viewButton} aria-pressed={view === 'record'} onClick={() => setView('record')}>Record preview</button>
        <span className={styles.viewCount}>{fields.length} question{fields.length === 1 ? '' : 's'}</span>
      </div>

      {missingLabels > 0 ? <p className={styles.warning}>Name {missingLabels} question{missingLabels === 1 ? '' : 's'} (the untitled ones) before saving.</p> : null}

      {view === 'questions' ? (
        <div className={styles.workspace}>
          <Toolbox onAdd={(type) => addField(type)} />
          <main className={styles.canvasColumn}>
            <Canvas fields={fields} selectedKey={selectedKey} onSelect={setSelectedKey} onMove={move} onRemove={removeField} />
          </main>
          <Inspector
            field={selectedField}
            count={fields.length}
            isRecordNamer={selectedField ? isRecordNamer(selectedField.key) : false}
            onPatch={patch}
            onRemove={removeField}
            onDuplicate={duplicateField}
          />
        </div>
      ) : (
        <RecordPreview name={details.name.trim() || 'Untitled form'} fields={fields} recordNameKey={recordNameKey} baseTemplateName={baseName} />
      )}

      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveButton} disabled={!canSave}>{saveLabel}</button>
        <a href={`/domain/${domainSlug}/forms`} className={styles.cancelLink}>Cancel</a>
      </div>
      </DndContext>
    </form>
  )
}

'use client'

import { useActionState, useState } from 'react'

import { createDocumentFromEditorAction, type DocumentEditorActionState } from '@/lib/actions/archive'
import { ConcernCharacterChips } from '@/components/characters/ConcernCharacterChips'

type Option = { id: number; name: string; systemManaged?: boolean }
type Character = { id: number; name: string }
type TemplateOption = { id: number; name: string; kind: 'document' | 'form'; documentTypeId: number; destinationFolderId: number; allowDestinationOverride: boolean; formSchema?: { version: 1; fields: Array<{ key: string; type: string; label: string; required?: boolean; options?: Array<{ label: string; value: string }>; relationshipLabel?: string }> } | null }

type Props = {
  tenantSlug: string
  types: Option[]
  folders: Array<Option & { depth: number }>
  templates?: TemplateOption[]
  activeCharacter: Character | null
  initialState?: DocumentEditorActionState
  supersedesDocumentId?: number
}

const emptyState: DocumentEditorActionState = { values: { title: '', body: '', documentTypeId: '', folderId: '', concernLinks: '', tagNames: '', templateId: '', formAnswers: '' } }

export function NewDocumentForm({ tenantSlug, types, folders, templates = [], activeCharacter, initialState = emptyState, supersedesDocumentId }: Props) {
  const [state, formAction, pending] = useActionState(createDocumentFromEditorAction, initialState)
  const values = state.values ?? emptyState.values!
  const defaultType = types.find((item) => item.name.toLocaleLowerCase() === 'plain text')?.id ?? ''
  const defaultTemplate = templates.find((item) => item.name.toLocaleLowerCase() === 'plain text' && item.kind === 'document') ?? templates[0]
  const [selectedTemplateId, setSelectedTemplateId] = useState(String(values.templateId || defaultTemplate?.id || ''))
  const [formAnswers, setFormAnswers] = useState(values.formAnswers ?? '')
  const selectedTemplate = templates.find((item) => String(item.id) === selectedTemplateId) ?? defaultTemplate
  const updateAnswers = (key: string, value: string) => {
    let current: Record<string, string> = {}
    try { current = formAnswers ? JSON.parse(formAnswers) : {} } catch { current = {} }
    current[key] = value
    setFormAnswers(JSON.stringify(current))
  }
  const message = state.error === 'missing'
    ? 'A title is required.'
    : state.error === 'type'
      ? 'Choose an active Document Type before creating a document.'
      : state.error === 'concerns'
        ? 'One of the Concerns entries was invalid. Your other fields are preserved.'
        : state.error === 'character'
          ? 'Choose an acting Character from the selector above — members must create through an acting Character, which becomes the non-removable Prepared-by credit (CC-2026-09-03-05).'
          : state.error === 'authorization'
            ? 'You are not authorized to create a record in this Domain.'
            : state.error === 'supersede-eligibility'
              ? 'That record cannot be superseded in its current lifecycle state; only Filed or Locked records can gain a successor.'
              : state.error === 'form-validation'
                ? 'Check the required form fields and template output. Your entries are still here.'
                : state.error === 'template-destination'
                  ? 'That Template is not available at the selected destination.'
                  : state.error === 'unable-to-create'
                    ? 'The record could not be created. Your entries are preserved so you can correct and retry.'
              : null

  return <form action={formAction} style={{ display: 'grid', gap: '1rem', padding: '1.25rem', border: '1px solid var(--tenant-accent)', background: 'var(--tenant-surface-bg)' }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} />
    {supersedesDocumentId ? <input type="hidden" name="supersedesDocumentId" value={supersedesDocumentId} /> : null}
    <input type="hidden" name="templateId" value={selectedTemplate?.id ?? ''} />
    <input type="hidden" name="formAnswers" value={formAnswers} />
    {message ? <p role="alert" style={{ color: '#8f2d21' }}>{message}</p> : null}
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Template</strong><input name="templateSearch" list="template-options" value={selectedTemplate?.name ?? ''} onChange={(event) => { const match = templates.find((item) => item.name.toLocaleLowerCase() === event.target.value.toLocaleLowerCase()); if (match) setSelectedTemplateId(String(match.id)) }} placeholder="Search Templates or Types…" autoComplete="off" /><datalist id="template-options">{templates.map((item) => <option key={item.id} value={item.name}>{item.kind} · {types.find((type) => type.id === item.documentTypeId)?.name ?? ''}</option>)}</datalist><small>{selectedTemplate ? `${selectedTemplate.kind === 'form' ? 'Form' : 'Document'} template · destination selected automatically` : 'Plain Text'}</small></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Document Type</strong><select name="documentTypeId" required value={selectedTemplate?.documentTypeId ?? defaultType} onChange={() => undefined}><option value="">Choose a type</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Title</strong><input name="title" required autoFocus defaultValue={values.title} /></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Destination folder</strong><select name="folderId" value={selectedTemplate?.allowDestinationOverride ? (values.folderId || String(selectedTemplate.destinationFolderId ?? '')) : String(selectedTemplate?.destinationFolderId ?? values.folderId)} onChange={() => undefined} disabled={Boolean(selectedTemplate && !selectedTemplate.allowDestinationOverride)}><option value="">Domain Root</option>{folders.filter((item) => !item.systemManaged).map((item) => <option key={item.id} value={item.id}>{'— '.repeat(item.depth)}{item.name}</option>)}</select>{selectedTemplate && !selectedTemplate.allowDestinationOverride ? <small>This Template files to its declared destination.</small> : null}</label>
    <section aria-label="Prepared by"><h2 style={{ fontSize: '1rem', marginBottom: '.3rem' }}>Prepared by</h2>{activeCharacter ? <p><strong>{activeCharacter.name}</strong> · acting Character (automatic credit)</p> : <p>No acting Character selected. This record will have no Prepared by credit; choose one from the Acting as selector above if desired.</p>}</section>
    <ConcernCharacterChips domainSlug={tenantSlug} initialValue={values.concernLinks} />
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Tags</strong><input name="tagNames" defaultValue={values.tagNames} placeholder="Comma-separated tags; existing vocabulary will autocomplete in a later pass" /></label>
    {selectedTemplate?.kind === 'form' && selectedTemplate.formSchema ? <section aria-label="Form fields" style={{ display: 'grid', gap: '.65rem' }}><h2>Form</h2>{selectedTemplate.formSchema.fields.map((field) => <label key={field.key} style={{ display: 'grid', gap: '.35rem' }}><strong>{field.label}{field.required ? ' *' : ''}</strong>{field.type === 'textarea' ? <textarea name={`formField_${field.key}`} rows={5} required={field.required} onChange={(event) => updateAnswers(field.key, event.target.value)} /> : field.type === 'select' ? <select name={`formField_${field.key}`} required={field.required} defaultValue="" onChange={(event) => updateAnswers(field.key, event.target.value)}><option value="">Choose…</option>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={`formField_${field.key}`} type={field.type === 'date' ? 'date' : 'text'} required={field.required} onChange={(event) => updateAnswers(field.key, event.target.value)} />}</label>)}</section> : <label style={{ display: 'grid', gap: '.35rem' }}><strong>Document</strong><textarea name="body" rows={18} placeholder="Begin writing in Markdown…" required defaultValue={values.body} /></label>}
    <div style={{ display: 'flex', gap: '.75rem' }}><button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create document'}</button><a href={`/domain/${tenantSlug}/records`}>Cancel</a></div>
  </form>
}

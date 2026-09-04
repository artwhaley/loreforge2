'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'

import { createDocumentFromEditorAction, type DocumentEditorActionState } from '@/lib/actions/archive'
import { ConcernCharacterChips } from '@/components/characters/ConcernCharacterChips'
import { FieldControl, type FieldValue } from '@/components/forms/FieldControl'
import type { LoreForgeFormField, LoreForgeFormSchema } from '@/lib/forms/schema'

type Option = { id: number; name: string; systemManaged?: boolean }
type Character = { id: number; name: string }
type TemplateOption = { id: number; name: string; kind: 'document' | 'form'; documentTypeId: number; destinationFolderId: number; allowDestinationOverride: boolean; destinations?: Array<Option & { depth?: number }>; formSchema?: LoreForgeFormSchema | null }

type Props = {
  tenantSlug: string
  types: Option[]
  folders: Array<Option & { depth: number }>
  templates?: TemplateOption[]
  activeCharacter: Character | null
  initialState?: DocumentEditorActionState
  supersedesDocumentId?: number
}

const emptyState: DocumentEditorActionState = { values: { title: '', body: '', documentTypeId: '', folderId: '', concernLinks: '', tagNames: '', preparedByCharacterIds: '', templateId: '', formAnswers: '' } }

/** Parse the hidden JSON answer snapshot without throwing. */
function parseAnswers(raw: string): Record<string, FieldValue> {
  try { return JSON.parse(raw || '{}') as Record<string, FieldValue> } catch { return {} }
}

/** A control value for FieldControl: checkboxes become booleans, others text. */
function controlValue(field: LoreForgeFormField, value: FieldValue | null | undefined): FieldValue | '' {
  if (value === null || value === undefined) return field.type === 'checkbox' ? false : ''
  if (field.type === 'checkbox') {
    if (typeof value === 'boolean') return value
    return value === 'true' || value === 'yes'
  }
  // Non-checkbox controls hold text; a stray boolean is normalized defensively.
  return typeof value === 'boolean' ? String(value) : value
}

/** Merge authored defaults into stored answers, keeping filer-entered values. */
function mergeDefaults(raw: string, schema: LoreForgeFormSchema | null | undefined): string {
  const parsed = parseAnswers(raw)
  for (const field of schema?.fields ?? []) {
    const existing = parsed[field.key]
    if (field.default !== undefined && (existing === undefined || existing === null || existing === '')) parsed[field.key] = field.default
  }
  return JSON.stringify(parsed)
}

export function NewDocumentForm({ tenantSlug, types, folders, templates = [], activeCharacter, initialState = emptyState, supersedesDocumentId }: Props) {
  const [state, formAction, pending] = useActionState(createDocumentFromEditorAction, initialState)
  const values = state.values ?? emptyState.values!
  const defaultType = types.find((item) => item.name.toLocaleLowerCase() === 'plain text')?.id ?? ''
  const defaultTemplate = templates.find((item) => item.name.toLocaleLowerCase() === 'plain text' && item.kind === 'document') ?? templates[0]
  const [selectedTemplateId, setSelectedTemplateId] = useState(String(values.templateId || defaultTemplate?.id || ''))
  const [templateQuery, setTemplateQuery] = useState(() => {
    const initial = templates.find((item) => String(item.id) === String(values.templateId || defaultTemplate?.id || ''))
    return initial?.name ?? ''
  })
  const [formAnswers, setFormAnswers] = useState(() => {
    const initialTemplate = templates.find((item) => String(item.id) === String(values.templateId || defaultTemplate?.id || ''))
    return mergeDefaults(values.formAnswers ?? '', initialTemplate?.kind === 'form' ? initialTemplate.formSchema : null)
  })
  const [title, setTitle] = useState(values.title)
  const [body, setBody] = useState(values.body)
  const [tagNames, setTagNames] = useState(values.tagNames)
  const [folderId, setFolderId] = useState(values.folderId || '')
  const selectedTemplate = templates.find((item) => String(item.id) === selectedTemplateId)
  const answerValues = useMemo(() => {
    try { return JSON.parse(formAnswers || '{}') as Record<string, string | boolean | null | undefined> } catch { return {} }
  }, [formAnswers])

  // A failed server action returns the complete submitted snapshot. Hydrate
  // controlled fields from it so the user never has to retype a document. The
  // guarded render keeps this synchronization local without an effect-driven
  // cascading render.
  const stateSignature = JSON.stringify([values.title, values.body, values.tagNames, values.preparedByCharacterIds, values.folderId, values.formAnswers, values.templateId])
  const [lastStateSignature, setLastStateSignature] = useState<string | null>(null)
  if (lastStateSignature !== stateSignature) {
    setLastStateSignature(stateSignature)
    setTitle(values.title)
    setBody(values.body)
    setTagNames(values.tagNames)
    setFolderId(values.folderId || '')
    setFormAnswers(values.formAnswers ?? '')
    if (values.templateId) {
      setSelectedTemplateId(values.templateId)
      const submittedTemplate = templates.find((item) => String(item.id) === values.templateId)
      if (submittedTemplate) setTemplateQuery(submittedTemplate.name)
    }
  }

  const hasEnteredContent = Boolean(title.trim() || body.trim() || tagNames.trim() || Object.values(answerValues).some((value) => value !== '' && value !== null && value !== undefined))
  const filteredTemplates = useMemo(() => {
    const query = templateQuery.trim().toLocaleLowerCase()
    if (!query) return []
    return templates.filter((item) => `${item.name} ${types.find((type) => type.id === item.documentTypeId)?.name ?? ''}`.toLocaleLowerCase().includes(query))
  }, [templateQuery, templates, types])

  const chooseTemplate = (template: TemplateOption) => {
    if (String(template.id) === selectedTemplateId) return
    if (hasEnteredContent && !window.confirm('Change Template? Your entered fields will be kept, but the new Template may render them differently.')) return
    setSelectedTemplateId(String(template.id))
    setTemplateQuery(template.name)
    setFolderId(String(template.destinationFolderId || ''))
    if (template.kind === 'form' && template.formSchema) {
      // New questions start from their authored default; kept answers survive.
      setFormAnswers((current) => mergeDefaults(current, template.formSchema))
    }
  }

  const updateAnswers = (key: string, value: FieldValue) => {
    const current = parseAnswers(formAnswers)
    current[key] = value
    setFormAnswers(JSON.stringify(current))
  }
  const message = state.error === 'missing'
    ? 'A title is required.'
    : state.error === 'type'
      ? 'Choose an active Document Type before creating a document.'
      : state.error === 'concerns'
        ? 'One of the Concerns entries was invalid. Your other fields are preserved.'
        : state.error === 'prepared-by'
          ? 'Prepared-by credits must be active Characters who belong to this Domain. Your other fields are preserved.'
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
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Template</strong><input name="templateSearch" role="combobox" aria-controls="template-results" aria-autocomplete="list" aria-expanded={filteredTemplates.length > 0 && templateQuery.trim().toLocaleLowerCase() !== selectedTemplate?.name.toLocaleLowerCase()} value={templateQuery} onChange={(event) => { const next = event.target.value; setTemplateQuery(next); const match = templates.find((item) => item.name.toLocaleLowerCase() === next.trim().toLocaleLowerCase()); if (match) chooseTemplate(match); else setSelectedTemplateId('') }} placeholder="Search Templates or Types…" autoComplete="off" />{filteredTemplates.length > 0 && templateQuery.trim().toLocaleLowerCase() !== selectedTemplate?.name.toLocaleLowerCase() ? <div id="template-results" role="listbox" style={{ display: 'grid', gap: '.2rem', padding: '.35rem', border: '1px solid var(--tenant-accent)', maxHeight: '14rem', overflowY: 'auto' }}>{filteredTemplates.map((item) => <button key={item.id} type="button" role="option" aria-selected={String(item.id) === selectedTemplateId} onClick={() => chooseTemplate(item)} style={{ textAlign: 'left' }}>{types.find((type) => type.id === item.documentTypeId)?.name ?? 'Document'} · {item.name} · {item.kind === 'form' ? 'Form' : 'Document'}</button>)}</div> : null}<small>{selectedTemplate ? `${selectedTemplate.kind === 'form' ? 'Form' : 'Document'} template · ${types.find((type) => type.id === selectedTemplate.documentTypeId)?.name ?? 'Document Type'}` : 'Choose a Template to continue. Templates are filtered to authorized choices.'}</small></label>
    <input type="hidden" name="documentTypeId" value={selectedTemplate?.documentTypeId ?? defaultType} />
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Title</strong><input name="title" required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Destination folder</strong>{selectedTemplate && !selectedTemplate.allowDestinationOverride ? <><input type="hidden" name="folderId" value={String(selectedTemplate.destinationFolderId)} /><select aria-label="Destination folder" value={String(selectedTemplate.destinationFolderId)} disabled><option value={String(selectedTemplate.destinationFolderId)}>{folders.find((item) => item.id === selectedTemplate.destinationFolderId)?.name ?? 'Declared destination'}</option></select><small>This Template files to its declared destination.</small></> : <select name="folderId" value={folderId || String(selectedTemplate?.destinationFolderId ?? '')} onChange={(event) => setFolderId(event.target.value)}><option value="">Domain Root</option>{(selectedTemplate?.destinations ?? folders).filter((item) => !item.systemManaged || item.id === selectedTemplate?.destinationFolderId).map((item) => <option key={item.id} value={item.id}>{'— '.repeat(item.depth ?? 0)}{item.name}</option>)}</select>}</label>
    <PreparedByCreditsPicker domainSlug={tenantSlug} activeCharacter={activeCharacter} initialValue={values.preparedByCharacterIds} />
    <ConcernCharacterChips domainSlug={tenantSlug} initialValue={values.concernLinks} />
    <TagPicker domainSlug={tenantSlug} initialValue={values.tagNames} onValueChange={setTagNames} />
    <input type="hidden" name="tagNames" value={tagNames} readOnly />
    {selectedTemplate?.kind === 'form' && selectedTemplate.formSchema ? <section aria-label="Form fields" style={{ display: 'grid', gap: '.8rem' }}><h2>Form</h2>{selectedTemplate.formSchema.fields.map((field) => <FieldControl key={field.key} field={field} domainSlug={tenantSlug} value={controlValue(field, answerValues[field.key])} onValueChange={(value) => updateAnswers(field.key, value)} />)}</section> : <label style={{ display: 'grid', gap: '.35rem' }}><strong>Document</strong><textarea name="body" rows={18} placeholder="Begin writing in Markdown…" required value={body} onChange={(event) => setBody(event.target.value)} /></label>}
    <div style={{ display: 'flex', gap: '.75rem' }}><button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create document'}</button><a href={`/domain/${tenantSlug}/records`}>Cancel</a></div>
  </form>
}

function parseIds(value: string | undefined): number[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? [...new Set(parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0))] : []
  } catch { return [] }
}

function PreparedByCreditsPicker({ domainSlug, activeCharacter, initialValue }: { domainSlug: string; activeCharacter: Character | null; initialValue?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Character[]>([])
  const [credits, setCredits] = useState<Character[]>([])
  const [lastInitial, setLastInitial] = useState(initialValue)
  const selectedIds = useMemo(() => new Set([activeCharacter?.id, ...credits.map((credit) => credit.id)].filter((id): id is number => Boolean(id))), [activeCharacter, credits])
  if (initialValue !== lastInitial) {
    setLastInitial(initialValue)
    setCredits(parseIds(initialValue).filter((id) => id !== activeCharacter?.id).map((id) => ({ id, name: `Character ${id}` })))
  }
  useEffect(() => {
    const value = query.trim()
    if (!value) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/character-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const body = await response.json() as { results?: Character[] }
        setResults(body.results ?? [])
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') setResults([])
      }
    }, 160)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, query])
  const addCredit = (character: Character) => {
    if (selectedIds.has(character.id)) return
    setCredits((current) => [...current, character])
    setQuery('')
    setResults([])
  }
  return <fieldset style={{ display: 'grid', gap: '.55rem' }}>
    <legend><strong>Prepared by</strong></legend>
    <small>{activeCharacter ? `${activeCharacter.name} is the acting Character and cannot be removed.` : 'No acting Character is selected. An owner/admin may file without a Prepared-by credit.'} Add additional credits by searching active Domain Characters.</small>
    {activeCharacter || credits.length > 0 ? <ul aria-label="Prepared-by credits" style={{ margin: 0, paddingLeft: '1.25rem' }}>{activeCharacter ? <li key={activeCharacter.id}><strong>{activeCharacter.name}</strong> · acting Character (required)</li> : null}{credits.map((credit) => <li key={credit.id}>{credit.name} <button type="button" onClick={() => setCredits((current) => current.filter((item) => item.id !== credit.id))}>Remove</button></li>)}</ul> : null}
    <input type="search" value={query} onChange={(event) => { const next = event.target.value; setQuery(next); if (!next.trim()) setResults([]) }} placeholder="Add another Prepared-by Character…" aria-label="Search additional Prepared-by Characters" autoComplete="off" />
    {results.length > 0 ? <ul role="listbox" style={{ margin: 0, paddingLeft: '1.25rem' }}>{results.map((result) => <li key={result.id}><button type="button" role="option" aria-selected={selectedIds.has(result.id)} disabled={selectedIds.has(result.id)} onClick={() => addCredit(result)}>{result.name}{selectedIds.has(result.id) ? ' (added)' : ''}</button></li>)}</ul> : null}
    <input type="hidden" name="preparedByCharacterIds" value={JSON.stringify(credits.map((credit) => credit.id))} readOnly />
  </fieldset>
}

type TagResult = { id: number; name: string }

function TagPicker({ domainSlug, initialValue, onValueChange }: { domainSlug: string; initialValue: string; onValueChange: (value: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TagResult[]>([])
  const [tags, setTags] = useState<string[]>(() => initialValue.split(',').map((tag) => tag.trim()).filter(Boolean))
  const [lastInitial, setLastInitial] = useState(initialValue)
  if (initialValue !== lastInitial) {
    setLastInitial(initialValue)
    setTags(initialValue.split(',').map((tag) => tag.trim()).filter(Boolean))
  }
  useEffect(() => {
    const value = query.trim()
    if (!value) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/tag-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const body = await response.json() as { results?: TagResult[] }
        setResults(body.results ?? [])
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') setResults([])
      }
    }, 160)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, query])
  const addTag = (name: string) => {
    const display = name.trim()
    if (!display || tags.some((tag) => tag.toLocaleLowerCase() === display.toLocaleLowerCase())) return
    const next = [...tags, display]
    setTags(next)
    onValueChange(next.join(', '))
    setQuery('')
    setResults([])
  }
  const removeTag = (name: string) => {
    const next = tags.filter((tag) => tag !== name)
    setTags(next)
    onValueChange(next.join(', '))
  }
  return <fieldset style={{ display: 'grid', gap: '.55rem' }}>
    <legend><strong>Tags</strong></legend>
    <small>Search an existing Domain tag or type a new tag and add it.</small>
    <input type="search" value={query} onChange={(event) => { const next = event.target.value; setQuery(next); if (!next.trim()) setResults([]) }} onKeyDown={(event) => { if (event.key === 'Enter' && query.trim()) { event.preventDefault(); addTag(query) } }} placeholder="Search or create a tag…" aria-label="Search or create a tag" autoComplete="off" />
    {results.length > 0 ? <ul role="listbox" style={{ margin: 0, paddingLeft: '1.25rem' }}>{results.map((result) => <li key={result.id}><button type="button" role="option" aria-selected={tags.some((tag) => tag.toLocaleLowerCase() === result.name.toLocaleLowerCase())} onClick={() => addTag(result.name)}>{result.name}</button></li>)}</ul> : null}
    {query.trim() && results.every((result) => result.name.toLocaleLowerCase() !== query.trim().toLocaleLowerCase()) ? <button type="button" onClick={() => addTag(query)}>Create “{query.trim()}”</button> : null}
    {tags.length > 0 ? <ul aria-label="Selected tags" style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', margin: 0, padding: 0, listStyle: 'none' }}>{tags.map((tag) => <li key={tag}><span>{tag}</span> <button type="button" onClick={() => removeTag(tag)}>Remove</button></li>)}</ul> : null}
  </fieldset>
}

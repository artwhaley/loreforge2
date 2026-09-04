'use client'

import { useEffect, useMemo, useState } from 'react'
import { useActionState } from 'react'

import { createFormTemplateAction, type TemplateActionState } from '@/lib/actions/templates'
import type { FormFieldType, LoreForgeFormField, LoreForgeFormSchema } from '@/lib/forms/schema'

type FolderOption = { id: number; name: string }
type TypeOption = { id: number; name: string }

const FIELD_TYPES: FormFieldType[] = ['text', 'textarea', 'date', 'select', 'checkbox', 'character']

const initialField = (index: number): LoreForgeFormField => ({ key: `field_${index}`, type: 'text', label: `Field ${index}`, required: false })

export function FormStudio({ domainSlug, folders, types, baseTemplates = [] }: { domainSlug: string; folders: FolderOption[]; types: TypeOption[]; baseTemplates?: Array<{ id: number; name: string }> }) {
  const [state, formAction, pending] = useActionState<TemplateActionState, FormData>(createFormTemplateAction, {})
  const [fields, setFields] = useState<LoreForgeFormField[]>([initialField(1)])
  const [output, setOutput] = useState('## {{field_1}}\n\n{{content}}')
  const [dirty, setDirty] = useState(false)
  const schema: LoreForgeFormSchema = useMemo(() => ({ version: 1, fields }), [fields])
  const updateField = (index: number, patch: Partial<LoreForgeFormField>) => setFields((current) => current.map((field, item) => item === index ? { ...field, ...patch } : field))
  const move = (index: number, direction: -1 | 1) => setFields((current) => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    const [field] = next.splice(index, 1)
    next.splice(target, 0, field)
    return next
  })
  const preview = output.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_match, key: string) => key === 'content' ? 'Sample narrative' : `[${key}]`)
  const previewTokens = [...output.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map((match) => match[1])
  const knownKeys = new Set([...fields.map((field) => field.key), 'content'])
  const unknownTokens = [...new Set(previewTokens.filter((token) => !knownKeys.has(token)))]
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  return <form action={formAction} style={{ display: 'grid', gap: '1rem' }}>
    <input type="hidden" name="domainSlug" value={domainSlug} />
    <input type="hidden" name="formSchema" value={JSON.stringify(schema)} />
    {state.error ? <p role="alert" style={{ color: '#9a2e25' }}>{state.error}</p> : null}
    <label>Name<input name="name" required placeholder="General Incident Report" onChange={() => setDirty(true)} /></label>
    <label>Document Type<select name="documentTypeId" required defaultValue="" onChange={() => setDirty(true)}> <option value="">Choose a type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
      <label>Available from<select name="scopeFolderId" required defaultValue="" onChange={() => setDirty(true)}> <option value="">Choose a Folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
      <label>Normal destination<select name="destinationFolderId" required defaultValue="" onChange={() => setDirty(true)}> <option value="">Choose a Folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
    </div>
    <label>Title output template<input name="titleTemplate" required defaultValue="{{field_1}}" onChange={() => setDirty(true)} /></label>
    <label>Base template (optional)<select name="baseTemplateId" defaultValue="" onChange={() => setDirty(true)}><option value="">No base template</option>{baseTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
    <section aria-labelledby="form-fields-heading" style={{ display: 'grid', gap: '.6rem' }}>
      <h2 id="form-fields-heading">Fields</h2>
      {fields.map((field, index) => <fieldset key={`${field.key}-${index}`} style={{ display: 'grid', gap: '.4rem', padding: '.75rem' }}>
        <legend>Field {index + 1}</legend>
        <label>Key<input value={field.key} onChange={(event) => updateField(index, { key: event.target.value })} /></label>
        <label>Label<input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} /></label>
        <label>Type<select value={field.type} onChange={(event) => updateField(index, { type: event.target.value as FormFieldType, options: event.target.value === 'select' ? (field.options ?? [{ label: 'Option', value: 'option' }]) : undefined })}>{FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} /> Required</label>
        {field.type === 'select' ? <label>Options (one `value | label` per line)<textarea value={(field.options ?? []).map((option) => `${option.value} | ${option.label}`).join('\n')} onChange={(event) => updateField(index, { options: event.target.value.split('\n').filter(Boolean).map((line) => { const [value, ...label] = line.split('|'); return { value: value.trim(), label: label.join('|').trim() || value.trim() } }) })} /></label> : null}
        {field.type === 'character' ? <label>Relationship label<input value={field.relationshipLabel ?? ''} onChange={(event) => updateField(index, { relationshipLabel: event.target.value })} placeholder="witness" /></label> : null}
        <div style={{ display: 'flex', gap: '.5rem' }}><button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Move up</button><button type="button" onClick={() => move(index, 1)} disabled={index === fields.length - 1}>Move down</button><button type="button" onClick={() => setFields((current) => current.filter((_item, item) => item !== index))} disabled={fields.length === 1}>Remove</button></div>
      </fieldset>)}
      <button type="button" onClick={() => setFields((current) => [...current, initialField(current.length + 1)])}>Add field</button>
    </section>
    <label>Document output<textarea name="bodyTemplate" required value={output} onChange={(event) => { setDirty(true); setOutput(event.target.value) }} rows={10} /></label>
    <label>Insert field<select aria-label="Insert field" onChange={(event) => { if (event.target.value) { setOutput((current) => `${current} {{${event.target.value}}}`); event.currentTarget.value = '' } }} defaultValue=""><option value="">Insert Field…</option>{fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>
    <section aria-label="Preview" style={{ padding: '1rem', background: '#f5f4ee', whiteSpace: 'pre-wrap' }}><strong>Preview</strong>{unknownTokens.length ? <p role="alert" style={{ color: '#9a2e25' }}>Unknown field token(s): {unknownTokens.map((token) => `{{${token}}}`).join(', ')}</p> : null}<p>{preview}</p></section>
    <button type="submit" disabled={pending || unknownTokens.length > 0}>{pending ? 'Saving…' : 'Save form'}</button>
  </form>
}

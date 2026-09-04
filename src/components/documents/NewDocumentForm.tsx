'use client'

import { useActionState } from 'react'

import { createDocumentFromEditorAction, type DocumentEditorActionState } from '@/lib/actions/archive'
import { ConcernCharacterChips } from '@/components/characters/ConcernCharacterChips'

type Option = { id: number; name: string; systemManaged?: boolean }
type Character = { id: number; name: string }

type Props = {
  tenantSlug: string
  types: Option[]
  folders: Array<Option & { depth: number }>
  activeCharacter: Character | null
  initialState?: DocumentEditorActionState
  supersedesDocumentId?: number
}

const emptyState: DocumentEditorActionState = { values: { title: '', body: '', documentTypeId: '', folderId: '', concernLinks: '', tagNames: '' } }

export function NewDocumentForm({ tenantSlug, types, folders, activeCharacter, initialState = emptyState, supersedesDocumentId }: Props) {
  const [state, formAction, pending] = useActionState(createDocumentFromEditorAction, initialState)
  const values = state.values ?? emptyState.values!
  const defaultType = types.find((item) => item.name.toLocaleLowerCase() === 'plain text')?.id ?? ''
  const message = state.error === 'missing'
    ? 'A title is required.'
    : state.error === 'type'
      ? 'Choose an active Document Type before creating a document.'
      : state.error === 'concerns'
        ? 'One of the Concerns entries was invalid. Your other fields are preserved.'
        : state.error === 'authorization'
          ? 'You are not authorized to create a record in this Domain.'
          : null

  return <form action={formAction} style={{ display: 'grid', gap: '1rem', padding: '1.25rem', border: '1px solid var(--tenant-accent)', background: 'var(--tenant-surface-bg)' }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} />
    {supersedesDocumentId ? <input type="hidden" name="supersedesDocumentId" value={supersedesDocumentId} /> : null}
    {message ? <p role="alert" style={{ color: '#8f2d21' }}>{message}</p> : null}
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Document Type</strong><select name="documentTypeId" required defaultValue={values.documentTypeId || defaultType}><option value="">Choose a type</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Title</strong><input name="title" required autoFocus defaultValue={values.title} /></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Destination folder</strong><select name="folderId" defaultValue={values.folderId}><option value="">Domain Root</option>{folders.filter((item) => !item.systemManaged).map((item) => <option key={item.id} value={item.id}>{'— '.repeat(item.depth)}{item.name}</option>)}</select></label>
    <section aria-label="Prepared by"><h2 style={{ fontSize: '1rem', marginBottom: '.3rem' }}>Prepared by</h2>{activeCharacter ? <p><strong>{activeCharacter.name}</strong> · acting Character (automatic credit)</p> : <p>No acting Character selected. This record will have no Prepared by credit; choose one from the Acting as selector above if desired.</p>}</section>
    <ConcernCharacterChips domainSlug={tenantSlug} initialValue={values.concernLinks} />
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Tags</strong><input name="tagNames" defaultValue={values.tagNames} placeholder="Comma-separated tags; existing vocabulary will autocomplete in a later pass" /></label>
    <label style={{ display: 'grid', gap: '.35rem' }}><strong>Document</strong><textarea name="body" rows={18} placeholder="Begin writing in Markdown…" required defaultValue={values.body} /></label>
    <div style={{ display: 'flex', gap: '.75rem' }}><button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create document'}</button><a href={`/domain/${tenantSlug}/records`}>Cancel</a></div>
  </form>
}

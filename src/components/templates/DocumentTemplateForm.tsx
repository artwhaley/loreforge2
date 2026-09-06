'use client'

import { useActionState } from 'react'

import { MarkdownSectionEditor } from '@/components/forms/FormStudio/MarkdownSectionEditor'
import { createDocumentTemplateAction, updateDocumentTemplateAction, type TemplateActionState } from '@/lib/actions/templates'

export type DocumentTemplateInitial = {
  name: string
  documentTypeId: number | '' | null
  scopeFolderId: number | '' | null
  baseTemplateId: number | '' | null
  titleTemplate: string
  bodyTemplate: string
}

type Option = { id: number; name: string }

type Props = {
  mode: 'create' | 'edit'
  templateId?: number
  domainSlug: string
  types: Option[]
  folders: Option[]
  baseTemplates: Option[]
  initial?: DocumentTemplateInitial
}

/**
 * Customer authoring surface for Markdown Document Templates: a plain-text
 * title template plus WYSIWYG/source Markdown body. Availability Folder,
 * Document Type, and optional base composition reuse the model Form Studio
 * already validates server-side. {{content}} is the only supported token.
 */
export function DocumentTemplateForm({ mode, templateId, domainSlug, types, folders, baseTemplates, initial }: Props) {
  const action = mode === 'edit' ? updateDocumentTemplateAction : createDocumentTemplateAction
  const [state, formAction, pending] = useActionState<TemplateActionState, FormData>(action, {})

  return (
    <form action={formAction} style={{ display: 'grid', gap: '1rem', maxWidth: '52rem' }}>
      <input type="hidden" name="domainSlug" value={domainSlug} />
      {mode === 'edit' && templateId != null ? <input type="hidden" name="templateId" value={templateId} /> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Name
        <input name="name" required defaultValue={initial?.name ?? ''} placeholder="Incident Report Template" />
      </label>

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Document Type
        <select name="documentTypeId" required defaultValue={initial?.documentTypeId ?? ''}>
          <option value="">Choose a Document Type</option>
          {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Available from Folder
        <select name="scopeFolderId" required defaultValue={initial?.scopeFolderId ?? ''}>
          <option value="">Choose an availability Folder</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Base Template (optional)
        <select name="baseTemplateId" defaultValue={initial?.baseTemplateId ?? ''}>
          <option value="">No base template</option>
          {baseTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Title
        <input name="titleTemplate" required defaultValue={initial?.titleTemplate ?? ''} placeholder="Incident Report" />
      </label>

      <MarkdownSectionEditor
        name="bodyTemplate"
        label="Body"
        description="Markdown for the new record. Use {{content}} where the author's writing goes."
        initialValue={initial?.bodyTemplate ?? '# Incident Report\n\n{{content}}'}
      />

      <div>
        <button type="submit" disabled={pending}>{pending ? 'Saving…' : mode === 'edit' ? 'Save template' : 'Create template'}</button>
      </div>
    </form>
  )
}

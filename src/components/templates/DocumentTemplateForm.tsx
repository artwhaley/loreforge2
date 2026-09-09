'use client'

import { useActionState } from 'react'

import { MarkdownSectionEditor } from '@/components/forms/FormStudio/MarkdownSectionEditor'
import { createDocumentTemplateAction, updateDocumentTemplateAction, type TemplateActionState } from '@/lib/actions/templates'

export type DocumentTemplateInitial = {
  name: string
  baseTemplateId: number | '' | null
  bodyTemplate: string
}

type Option = { id: number; name: string }

type Props = {
  mode: 'create' | 'edit'
  templateId?: number
  domainSlug: string
  /** The Document Type this template belongs to. The Type owns its template, so it arrives fixed — never re-selected here. */
  documentType: Option
  baseTemplates: Option[]
  initial?: DocumentTemplateInitial
}

/**
 * Customer authoring surface for Markdown Document Templates. The template is
 * reached from the Document Type that owns it: placement (folders) and
 * permissions live on the Type, so the form carries the Type as read-only
 * context. The Name is the record title — there is no separate title field.
 * {{content}} is the only supported token.
 */
export function DocumentTemplateForm({ mode, templateId, domainSlug, documentType, baseTemplates, initial }: Props) {
  const action = mode === 'edit' ? updateDocumentTemplateAction : createDocumentTemplateAction
  const [state, formAction, pending] = useActionState<TemplateActionState, FormData>(action, {})

  return (
    <form action={formAction} style={{ display: 'grid', gap: '1rem', maxWidth: '52rem' }}>
      <input type="hidden" name="domainSlug" value={domainSlug} />
      <input type="hidden" name="documentTypeId" value={documentType.id} />
      {mode === 'edit' && templateId != null ? <input type="hidden" name="templateId" value={templateId} /> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Name
        <input name="name" required defaultValue={initial?.name ?? ''} placeholder={`${documentType.name} Template`} title="The template's name — records start with this as their title. There is no separate title field." />
      </label>

      <label style={{ display: 'grid', gap: '.3rem' }}>
        Base Template (optional)
        <select name="baseTemplateId" defaultValue={initial?.baseTemplateId ?? ''}>
          <option value="">No base template</option>
          {baseTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>

      <MarkdownSectionEditor
        name="bodyTemplate"
        label="Body"
        description="Markdown for the new record. Use {{content}} where the author's writing goes. The record title comes from the Name above."
        initialValue={initial?.bodyTemplate || `# ${documentType.name}\n\n{{content}}`}
        aspectSquare
      />

      <div>
        <button type="submit" disabled={pending}>{pending ? 'Saving…' : mode === 'edit' ? 'Save template' : 'Create template'}</button>
      </div>
    </form>
  )
}

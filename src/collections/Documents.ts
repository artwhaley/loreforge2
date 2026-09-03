import type { CollectionConfig } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { assertLifecycleTransition, canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tenant', 'origin', 'updatedAt'],
  },
  timestamps: true,
  versions: { maxPerDoc: 0 },
  access: {
    // Permanent deletion is never an ordinary Domain action. P04 workflow
    // uses softDeletedAt/softDeletedBy and a reversible restore path.
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const folder = data?.folder ?? originalDoc?.folder
        const domainId = relationId(data?.domain ?? originalDoc?.domain)
        if (folder === null || folder === undefined || folder === '') {
          throw new Error('Every Document must belong to a Folder; use the Domain Root when no branch is selected.')
        }
        const documentType = data?.documentType ?? originalDoc?.documentType
        if (operation === 'create' && (documentType === null || documentType === undefined || documentType === '')) throw new Error('Every Document must have a Document Type.')
        const from = String(originalDoc?.lifecycle ?? 'draft') as Lifecycle
        const to = String(data?.lifecycle ?? originalDoc?.lifecycle ?? 'draft') as Lifecycle
        if (operation === 'update') {
          assertLifecycleTransition(from, to)
          const isPrivilegedTransition = from !== to && to !== 'pending_review'
          if (isPrivilegedTransition && !(req.context as Record<string, unknown> | undefined)?.interimWorkflowAuthorized) {
            if (!req.user?.id || !domainId) throw new Error('A verified Domain supervisor is required for this lifecycle transition.')
            const authorized = await authorizeInterimOperation(req.payload, { userId: req.user.id }, domainId)
            if (authorized !== true) throw new Error(authorized)
          }
          if (data?.body !== undefined && data.body !== originalDoc?.body && !canEditDocumentBody(from)) throw new Error('This Document is not editable in its current lifecycle state.')
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      label: 'Domain',
      admin: { description: 'Canonical Domain relationship. Populated by the Phase 3 migration.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      admin: { hidden: true },
    },
    {
      name: 'documentType',
      type: 'relationship',
      relationTo: 'document-types',
      required: true,
      index: true,
      label: 'Document Type',
    },
    {
      name: 'folder',
      type: 'relationship',
      relationTo: 'folders',
      index: true,
      required: false,
      admin: {
        description: 'Archive folder. Leave empty to file at the root.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Canonical Markdown body. Presentation (theme) is applied by the tenant, never stored here.',
      },
    },
    {
      name: 'origin',
      type: 'select',
      required: true,
      defaultValue: 'web-editor',
      options: [
        { label: 'Web editor', value: 'web-editor' },
        { label: 'Markdown import', value: 'markdown-import' },
        { label: 'Form', value: 'form' },
      ],
    },
    {
      name: 'sourceKind',
      type: 'select',
      required: true,
      defaultValue: 'web',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Markdown import', value: 'markdown-import' },
        { label: 'Form', value: 'form' },
        { label: 'Copy', value: 'copy' },
        { label: 'Correspondence', value: 'correspondence' },
        { label: 'Second Life', value: 'second-life' },
      ],
    },
    {
      name: 'lifecycle',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Review', value: 'pending_review' },
        { label: 'Filed', value: 'filed' },
        { label: 'Locked', value: 'locked' },
      ],
    },
    { name: 'publicAccess', type: 'select', required: true, defaultValue: 'inherit', options: [{ label: 'Inherit', value: 'inherit' }, { label: 'Private', value: 'private' }, { label: 'Public', value: 'public' }] },
    { name: 'softDeletedAt', type: 'date', admin: { readOnly: true } },
    { name: 'softDeletedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Author, if known',
      },
    },
  ],
}

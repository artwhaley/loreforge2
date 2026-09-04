import type { CollectionConfig } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { canAccessDocument } from '@/lib/authorization/documentAccess'
import { assertLifecycleTransition, canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'
import { ensurePreparedBy } from '@/lib/documents/links'

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
    // Direct REST/GraphQL/revision reads, updates, and version reads must
    // prove the caller can access this exact Document through the shared
    // interim decision (src/lib/authorization/documentAccess.ts). Internal
    // server queries use Local API overrideAccess after their own tenant
    // boundary has been established; the Local API in Payload 3.88 defaults
    // to overrideAccess, so these functions guard the HTTP surface.
    read: async ({ req, id }) => {
      if (!req.user || id === undefined || id === null) return false
      return canAccessDocument({ payload: req.payload, user: req.user, documentId: id, capability: 'read' })
    },
    update: async ({ req, id }) => {
      if (!req.user || id === undefined || id === null) return false
      return canAccessDocument({ payload: req.payload, user: req.user, documentId: id, capability: 'update' })
    },
    readVersions: async ({ req, id }) => {
      if (!req.user || id === undefined || id === null) return false
      return canAccessDocument({ payload: req.payload, user: req.user, documentId: id, capability: 'read' })
    },
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
        // Defense in depth behind access.update: a Document may never be filed
        // into a Folder outside its own Domain (or legacy Tenant). This also
        // blocks cross-Domain re-file even when authority exists elsewhere.
        if (operation === 'create' || data?.folder !== undefined) {
          const folderId = relationId(folder)
          if (folderId) {
            const folderRecord = await req.payload.findByID({ collection: 'folders', id: folderId, depth: 0, overrideAccess: true }).catch(() => null) as { domain?: unknown; tenant?: unknown } | null
            const folderDomainId = relationId(folderRecord?.domain)
            if (domainId && folderDomainId && Number(folderDomainId) !== Number(domainId)) {
              throw new Error('A Document cannot be filed into a Folder from another Domain.')
            }
            if (!domainId) {
              const tenantId = relationId(data?.tenant ?? originalDoc?.tenant)
              const folderTenantId = relationId(folderRecord?.tenant)
              if (tenantId && folderTenantId && Number(folderTenantId) !== Number(tenantId)) {
                throw new Error('A Document cannot be filed into a Folder from another Tenant.')
              }
            }
          }
        }
        const documentType = data?.documentType ?? originalDoc?.documentType
        if (operation === 'create' && (documentType === null || documentType === undefined || documentType === '')) throw new Error('Every Document must have a Document Type.')
        const from = String(originalDoc?.lifecycle ?? 'draft') as Lifecycle
        const to = String(data?.lifecycle ?? originalDoc?.lifecycle ?? 'draft') as Lifecycle
        if (operation === 'update') {
          const supersedesLock = (req.context as Record<string, unknown> | undefined)?.supersedesLock === true
          if (supersedesLock) {
            if (to !== 'locked') throw new Error('A superseded Document can only transition to Locked.')
          } else {
            assertLifecycleTransition(from, to)
          }
          const isPrivilegedTransition = from !== to && to !== 'pending_review'
          if (isPrivilegedTransition && !supersedesLock && !(req.context as Record<string, unknown> | undefined)?.interimWorkflowAuthorized) {
            if (!req.user?.id || !domainId) throw new Error('A verified Domain supervisor is required for this lifecycle transition.')
            const authorized = await authorizeInterimOperation(req.payload, { userId: req.user.id }, domainId)
            if (authorized !== true) throw new Error(authorized)
          }
          if (data?.body !== undefined && data.body !== originalDoc?.body && !canEditDocumentBody(from)) throw new Error('This Document is not editable in its current lifecycle state.')
        }
        const context = req.context as Record<string, unknown> | undefined
        // Every normal application-created Document must carry an explicit
        // authoring context. If an acting Character is selected, the context
        // also drives the required Prepared by credit. Seeders/migrations
        // use the explicit system seam; a missing request user must never be
        // an accidental bypass of this boundary.
        if (operation === 'create' && !context?.allowSystemCreate && !context?.allowUserCreate && !context?.preparedByCharacterId) {
          throw new Error('Document creation requires an explicit authoring context.')
        }
        return data
      },
    ],
    afterChange: [async ({ doc, operation, req }) => {
      const context = req.context as Record<string, unknown> | undefined
      const preparedByCharacterId = context?.preparedByCharacterId
      const domainId = relationId(doc.domain)
      if (operation === 'create' && domainId && preparedByCharacterId) {
        await ensurePreparedBy({
          payload: req.payload,
          domainId,
          documentId: doc.id,
          characterId: Number(preparedByCharacterId),
          actor: { userId: Number(req.user?.id ?? context?.actorUserId ?? 0), characterId: Number(preparedByCharacterId) },
          skipAuthorization: true,
        })
      }
      return doc
    }],
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

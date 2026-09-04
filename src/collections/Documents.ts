import type { CollectionConfig } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { assertLifecycleTransition, canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'
import { ensurePreparedBy } from '@/lib/documents/links'
import { authorizeSharedDocumentAccess } from '@/lib/documents/sharing'

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
    // Direct REST/revision reads must prove the caller can read this exact
    // Document. Internal server queries use Local API overrideAccess after
    // their own tenant boundary has been established.
    read: async ({ req, id }) => {
      if (!req.user || id === undefined || id === null) return false
      const currentResult = await req.payload.find({ collection: 'documents', where: { id: { equals: id } }, depth: 0, limit: 1, overrideAccess: true })
      const current = currentResult.docs[0]
      if (!current || current.softDeletedAt) return false
      const domainId = relationId(current.domain)
      const tenantId = relationId(current.tenant)
      if (domainId) {
        const domain = await req.payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true }).catch(() => null)
        const ownerId = relationId(domain?.ownerUser)
        if (ownerId && Number(ownerId) === Number(req.user.id)) return true
        const admins = await req.payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domainId } }, { user: { equals: req.user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
        if (admins.docs.length > 0) return true
        if (await authorizeSharedDocumentAccess({ payload: req.payload, documentId: id, userId: req.user.id, capability: 'read' })) return true
        const controlled = await req.payload.find({ collection: 'characters', where: { and: [{ controlledBy: { equals: req.user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 200, overrideAccess: true })
        if (controlled.docs.length === 0) return false
        const memberships = await req.payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { in: controlled.docs.map((character) => character.id) } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
        return memberships.docs.length > 0
      }
      if (!tenantId) return false
      const memberships = await req.payload.find({ collection: 'memberships', where: { and: [{ tenant: { equals: tenantId } }, { user: { equals: req.user.id } }] }, depth: 0, limit: 1, overrideAccess: true })
      return memberships.docs.length > 0
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

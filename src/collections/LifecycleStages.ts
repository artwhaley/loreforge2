import type { CollectionConfig } from 'payload'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

/**
 * P08X-T02: one row per (Document Type, lifecycle stage) carrying the
 * intentional per-stage configuration — enabled/allow-on-creation, the stage's
 * assigned Folder, the private-drafts switch (Draft row), and the four role
 * lists (read / write / edit others / manage).
 *
 * Access is closed; mutations flow exclusively through the Document Type
 * inspector server action (P08X-T04). The DB unique (documentType, stage)
 * index backs the one-row-per-stage invariant at the storage layer.
 */
export const LifecycleStages: CollectionConfig = {
  slug: 'lifecycle-stages',
  admin: {
    useAsTitle: 'stage',
    defaultColumns: ['documentType', 'stage', 'enabled', 'folder'],
  },
  timestamps: true,
  access: {
    read: ({ req }) => Boolean((req.user as { isPlatformAdmin?: boolean } | null)?.isPlatformAdmin),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    { unique: true, fields: ['documentType', 'stage'] },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const documentTypeId = relationId(data?.documentType ?? originalDoc?.documentType)
      if (operation === 'create' && !documentTypeId) throw new Error('Every lifecycle stage row must belong to a Document Type.')
      if (!documentTypeId) return data
      const type = await req.payload.findByID({ collection: 'document-types', id: documentTypeId, depth: 0, overrideAccess: true }).catch(() => null) as { domain?: unknown } | null
      if (!type) throw new Error('The lifecycle stage Document Type does not exist.')
      const domainId = relationId(type.domain)
      const folderId = relationId(data?.folder ?? originalDoc?.folder)
      if (folderId != null && domainId != null) {
        const folder = await req.payload.findByID({ collection: 'folders', id: folderId, depth: 0, overrideAccess: true }).catch(() => null) as { domain?: unknown } | null
        if (!folder || relationId(folder.domain) !== Number(domainId)) throw new Error('A lifecycle stage Folder must belong to the same Domain as its Document Type.')
      }
      // P08X-T04 drives these lists; defense in depth keeps every role
      // assignment inside the Type's Domain.
      for (const field of ['readRoles', 'writeRoles', 'editOthersRoles', 'manageRoles'] as const) {
        const raw = data?.[field] ?? originalDoc?.[field]
        const ids = (Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw])
          .map((value) => relationId(value))
          .filter((id): id is number => id != null)
        if (ids.length === 0) continue
        const roles = await req.payload.find({ collection: 'roles', where: { and: [{ id: { in: ids } }] }, depth: 0, limit: ids.length, overrideAccess: true })
        const roleDomainById = new Map(roles.docs.map((role) => [Number(role.id), relationId((role as { domain?: unknown }).domain)]))
        for (const id of ids) {
          const roleDomain = roleDomainById.get(id)
          if (roleDomain == null || domainId == null || Number(roleDomain) !== Number(domainId)) throw new Error(`A lifecycle stage ${field} role must belong to the same Domain as the Document Type.`)
        }
      }
      return data
    }],
    // P08X-T06 invalidation note: stage role lists feed authorization
    // decisions, so a write must invalidate the Domain's cached authorization
    // facts. The bump intentionally lives at the mutation seams
    // (applyLifecycleStageConfig, deleteTypeAction) rather than in a
    // collection hook — a hook's nested payload.update on the domains
    // collection collides with the row create/update transaction
    // (SQLITE_BUSY on the shared SQLite connection). Access is closed, so the
    // seams are the only write paths.
  },
  fields: [
    { name: 'documentType', type: 'relationship', relationTo: 'document-types', required: true, index: true },
    {
      name: 'stage',
      type: 'select',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Filed', value: 'filed' },
        { label: 'Deprecated', value: 'deprecated' },
      ],
    },
    { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Part of this Document Type\u2019s lifecycle', admin: { description: 'When unchecked the stage is not part of the Type\u2019s lifecycle and the rest of the row is inert.' } },
    { name: 'allowOnCreation', type: 'checkbox', defaultValue: false, label: 'Allow on creation', admin: { description: 'Lets the create-document screen start a record in this stage (subject to the actor\u2019s stage permissions).' } },
    { name: 'folder', type: 'relationship', relationTo: 'folders', label: 'Stage folder', index: true, admin: { description: 'Documents in this stage live in this Folder; stage transitions relocate records here.' } },
    { name: 'privateDraftsAllowed', type: 'checkbox', defaultValue: true, label: 'Private drafts allowed', admin: { description: 'Draft row only: when enabled, creators choose private or public draft. Private drafts are visible only to the creating Character.' } },
    { name: 'readRoles', type: 'relationship', relationTo: 'roles', hasMany: true, label: 'Read roles', admin: { description: 'Roles that may view documents at this stage.' } },
    { name: 'writeRoles', type: 'relationship', relationTo: 'roles', hasMany: true, label: 'Write roles', admin: { description: 'Roles that may create documents at this stage and edit their own at this stage.' } },
    { name: 'editOthersRoles', type: 'relationship', relationTo: 'roles', hasMany: true, label: 'Edit others roles', admin: { description: 'Roles that may edit other people\u2019s documents at this stage directly.' } },
    { name: 'manageRoles', type: 'relationship', relationTo: 'roles', hasMany: true, label: 'Manage roles', admin: { description: 'Roles that may change a document\u2019s lifecycle stage into this one (which moves it to this stage\u2019s folder).' } },
  ],
}
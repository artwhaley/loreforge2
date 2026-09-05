import type { CollectionConfig } from 'payload'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

/** Domain-scoped record types. Plain Text is seeded for every active Domain. */
export const DocumentTypes: CollectionConfig = {
  slug: 'document-types',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'active', 'defaultFilingPolicy'] },
  timestamps: true,
  access: { read: ({ req }) => Boolean((req.user as { isPlatformAdmin?: boolean } | null)?.isPlatformAdmin), create: () => false, update: () => false, delete: () => false },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const name = String(data?.name ?? originalDoc?.name ?? '').trim()
      if (operation === 'create' && !domainId) throw new Error('Every Document Type must belong to a Domain.')
      if (domainId && name && Boolean(data?.active ?? originalDoc?.active ?? true)) {
        const existing = await req.payload.find({ collection: 'document-types', where: { domain: { equals: domainId } }, depth: 0, limit: 500 })
        const duplicate = existing.docs.find((item) => Number(item.id) !== Number(originalDoc?.id) && Boolean(item.active) && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())
        if (duplicate) throw new Error('An active Document Type with this name already exists in the Domain.')
      }
      // P07X-T05: every configured lifecycle route Folder must belong to this
      // Type's Domain. Multiple states may share one Folder; a foreign Folder
      // must never be routable from this Type.
      const routeFields = ['defaultFolder', 'draftFolder', 'pendingReviewFolder', 'filedFolder', 'lockedFolder'] as const
      const routeIds = routeFields
        .map((field) => relationId(data?.[field] ?? originalDoc?.[field]))
        .filter((id): id is number => id != null)
      if (domainId && routeIds.length > 0) {
        const folders = await req.payload.find({ collection: 'folders', where: { and: [{ id: { in: routeIds } }] }, depth: 0, limit: 500, overrideAccess: true })
        const folderDomainById = new Map(folders.docs.map((folder) => [Number(folder.id), relationId((folder as { domain?: unknown }).domain)]))
        for (const id of routeIds) {
          const folderDomain = folderDomainById.get(id)
          if (folderDomain == null || Number(folderDomain) !== Number(domainId)) throw new Error('A Document Type routing Folder must belong to the same Domain as the Type.')
        }
      }
      return data
    }],
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'defaultFilingPolicy', type: 'select', required: true, defaultValue: 'direct-file', options: [{ label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
    { name: 'defaultFolder', type: 'relationship', relationTo: 'folders', label: 'Default folder', admin: { description: 'Fallback route Folder when a lifecycle state has no specific route.' } },
    { name: 'draftFolder', type: 'relationship', relationTo: 'folders', label: 'Draft folder', admin: { description: 'P07X-T05 lifecycle route for Draft records.' } },
    { name: 'pendingReviewFolder', type: 'relationship', relationTo: 'folders', label: 'Pending review folder', admin: { description: 'P07X-T05 lifecycle route for Pending-Review records.' } },
    { name: 'filedFolder', type: 'relationship', relationTo: 'folders', label: 'Filed folder', admin: { description: 'P07X-T05 lifecycle route for Filed records.' } },
    { name: 'lockedFolder', type: 'relationship', relationTo: 'folders', label: 'Locked folder', admin: { description: 'P07X-T05 lifecycle route for Locked records.' } },
    { name: 'templateFilingPolicy', type: 'select', required: true, defaultValue: 'inherit', label: 'Template-compatible filing policy', options: [{ label: 'Inherit', value: 'inherit' }, { label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
  ],
}

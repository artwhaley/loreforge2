import type { CollectionConfig } from 'payload'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

/**
 * P08X-T02: navigation-only folders for the Document Type tree.
 *
 * These organize Document Types visually (departments are the roots, manual
 * subfolders nest beneath them); they are NOT archive Folders and never hold
 * Documents. Direct writes are access-closed; mutations flow through the
 * audited type-tree server actions (P08X-T03).
 */
export const TypeFolders: CollectionConfig = {
  slug: 'type-folders',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'domain', 'department', 'parent'],
  },
  timestamps: true,
  access: {
    read: ({ req }) => Boolean((req.user as { isPlatformAdmin?: boolean } | null)?.isPlatformAdmin),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      if (operation === 'create' && !domainId) throw new Error('Every type folder must belong to a Domain.')
      const parentId = relationId(data?.parent ?? originalDoc?.parent)
      if (parentId != null) {
        if (Number(parentId) === Number(originalDoc?.id)) throw new Error('A type folder cannot be its own parent.')
        if (domainId) {
          const parent = await req.payload.findByID({ collection: 'type-folders', id: parentId, depth: 0, overrideAccess: true }).catch(() => null) as { domain?: unknown; parent?: unknown; id?: unknown } | null
          if (!parent) throw new Error('The parent type folder does not exist.')
          if (relationId(parent.domain) !== Number(domainId)) throw new Error('A type folder parent must belong to the same Domain as the child.')
          // Ancestor walk guards cycles (same spirit as the Folders interface).
          let cursor: { parent?: unknown; id?: unknown } | null = parent
          const guard = new Set<number>()
          while (cursor) {
            const cursorId = Number((cursor as { id?: unknown }).id ?? parentId)
            if (guard.has(cursorId)) throw new Error('A type folder cannot be nested inside itself (cycle).')
            guard.add(cursorId)
            const nextId = relationId((cursor as { parent?: unknown }).parent)
            if (nextId == null) break
            if (Number(nextId) === Number(originalDoc?.id)) throw new Error('A type folder cannot be nested inside its own descendant (cycle).')
            cursor = await req.payload.findByID({ collection: 'type-folders', id: nextId, depth: 0, overrideAccess: true }).catch(() => null) as { parent?: unknown; id?: unknown } | null
            if (!cursor) break
          }
        }
      }
      const departmentId = relationId(data?.department ?? originalDoc?.department)
      if (departmentId != null && domainId) {
        const department = await req.payload.findByID({ collection: 'subdomains', id: departmentId, depth: 0, overrideAccess: true }).catch(() => null) as { domain?: unknown } | null
        if (!department || relationId(department.domain) !== Number(domainId)) throw new Error('A type folder Department must belong to the same Domain as the folder.')
      }
      return data
    }],
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'department', type: 'relationship', relationTo: 'subdomains', label: 'Department', index: true, admin: { description: 'Which Department root this navigation folder hangs under.' } },
    { name: 'name', type: 'text', required: true },
    { name: 'parent', type: 'relationship', relationTo: 'type-folders', index: true, admin: { description: 'Optional nesting inside another navigation folder.' } },
    { name: 'systemManaged', type: 'checkbox', defaultValue: false, admin: { description: 'System-created folders (e.g. Unassigned scaffolding) are protected from deletion.' } },
  ],
}
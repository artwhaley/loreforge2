import type { CollectionConfig } from 'payload'

import { assertFolderPlacement } from '@/lib/archive/folderInvariants'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

/**
 * Tenant-owned archive folders with a nullable self-parent (spec §6.3).
 *
 * Only ordinary nesting is needed for the MVP — no ACL or inheritance engine
 * (Ticket 05 guardrails). Tenant scoping of reads/writes is enforced in the
 * application data layer (see src/lib/tenant), not here.
 */
export const Folders: CollectionConfig = {
  slug: 'folders',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tenant', 'parent'],
  },
  access: {
    read: () => true,
  },
  timestamps: true,
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      if (operation === 'create' && !domainId) throw new Error('Every Folder must belong to a Domain.')
      const parentId = relationId(data?.parent ?? originalDoc?.parent)
      if (parentId && domainId) {
        const parent = await req.payload.findByID({ collection: 'folders', id: parentId, depth: 0 })
        const all = await req.payload.find({ collection: 'folders', depth: 0, limit: 10000 })
        assertFolderPlacement(
          { id: originalDoc?.id ?? 'new', domainId, parentId },
          { id: parent.id, domainId: relationId(parent.domain) ?? relationId(parent.tenant) ?? '', parentId: relationId(parent.parent) },
          all.docs.map((folder) => ({ id: folder.id, domainId: relationId(folder.domain) ?? relationId(folder.tenant) ?? '', parentId: relationId(folder.parent), systemManaged: Boolean(folder.systemManaged) })),
        )
      }
      if (originalDoc?.systemManaged && data?.parent !== undefined && relationId(data.parent) !== relationId(originalDoc.parent)) {
        throw new Error('System-managed Domain roots cannot be moved.')
      }
      return data
    }],
    beforeDelete: [async ({ id, req }) => {
      const folder = await req.payload.findByID({ collection: 'folders', id, depth: 0 })
      if (folder.systemManaged) throw new Error('System-managed Domain roots cannot be deleted.')
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
    { name: 'subdomain', type: 'relationship', relationTo: 'subdomains', label: 'Department' },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'folders',
      index: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
    },
    { name: 'systemManaged', type: 'checkbox', defaultValue: false, admin: { description: 'Domain root folders are protected from normal deletion or movement.' } },
    { name: 'filingPolicy', type: 'select', required: true, defaultValue: 'inherit', options: [{ label: 'Inherit', value: 'inherit' }, { label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
  ],
}

import type { CollectionConfig } from 'payload'

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
  fields: [
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      index: true,
      label: 'Domain',
      admin: { description: 'Canonical Domain relationship. Populated by the Phase 3 migration.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      admin: { hidden: true },
    },
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
  ],
}

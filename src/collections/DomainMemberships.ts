import type { CollectionConfig } from 'payload'

/** Character participation in a Domain. This replaces spike User Memberships. */
export const DomainMemberships: CollectionConfig = {
  slug: 'domain-memberships',
  admin: {
    useAsTitle: 'character',
    defaultColumns: ['tenant', 'character', 'status', 'updatedAt'],
  },
  timestamps: true,
  indexes: [{ unique: true, fields: ['tenant', 'character'] }],
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
      label: 'Legacy Tenant (migration only)',
      admin: { hidden: true },
    },
    {
      name: 'character',
      type: 'relationship',
      relationTo: 'characters',
      required: true,
      index: true,
      label: 'Character',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      name: 'addedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Added by',
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Membership note',
    },
  ],
}

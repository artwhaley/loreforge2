import type { CollectionConfig } from 'payload'

/** User-level operational authority; distinct from Character roles and membership. */
export const DomainAdmins: CollectionConfig = {
  slug: 'domain-admins',
  admin: { useAsTitle: 'user', defaultColumns: ['domain', 'user', 'status', 'updatedAt'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['domain', 'user'] }],
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
    { name: 'addedBy', type: 'relationship', relationTo: 'users' },
  ],
}

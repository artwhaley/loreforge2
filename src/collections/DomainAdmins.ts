import type { CollectionConfig } from 'payload'

/** Legacy/migration evidence only; never an authority source (P08-GATE-04).
 * Domain authority exists only through the domain_admin Character. */
export const DomainAdmins: CollectionConfig = {
  slug: 'domain-admins',
  admin: { useAsTitle: 'user', defaultColumns: ['domain', 'user', 'status', 'updatedAt'] },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  indexes: [{ unique: true, fields: ['domain', 'user'] }],
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
    { name: 'addedBy', type: 'relationship', relationTo: 'users' },
  ],
}

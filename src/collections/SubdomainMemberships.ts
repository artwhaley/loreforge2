import type { CollectionConfig } from 'payload'

export const SubdomainMemberships: CollectionConfig = {
  slug: 'subdomain-memberships',
  admin: { useAsTitle: 'character', defaultColumns: ['subdomain', 'character', 'status', 'updatedAt'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['subdomain', 'character'] }],
  fields: [
    { name: 'subdomain', type: 'relationship', relationTo: 'subdomains', required: true },
    { name: 'character', type: 'relationship', relationTo: 'characters', required: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
    { name: 'addedBy', type: 'relationship', relationTo: 'users' },
    { name: 'note', type: 'textarea' },
  ],
}

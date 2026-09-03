import type { CollectionConfig } from 'payload'

export const Subdomains: CollectionConfig = {
  slug: 'subdomains',
  labels: { singular: 'Department', plural: 'Departments' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'headCharacter', 'publicListing'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['domain', 'slug'] }],
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, label: 'Domain' },
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
    { name: 'headCharacter', type: 'relationship', relationTo: 'characters', label: 'Head Character' },
    { name: 'adminCharacters', type: 'relationship', relationTo: 'characters', hasMany: true, label: 'Admin Characters' },
    { name: 'publicListing', type: 'checkbox', defaultValue: false },
  ],
}

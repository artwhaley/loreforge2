import type { CollectionConfig } from 'payload'

export const Memberships: CollectionConfig = {
  slug: 'memberships',
  admin: {
    useAsTitle: 'user',
    defaultColumns: ['user', 'tenant', 'role'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
    },
  ],
}

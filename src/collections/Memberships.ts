import type { CollectionConfig } from 'payload'

// Legacy compatibility only (P05R-T06 D). New product code must not depend on
// this model — Domain membership is the canonical participation model. Removal
// is P10 work (DEF-TENANT-01).
export const Memberships: CollectionConfig = {
  slug: 'memberships',
  admin: {
    hidden: true,
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

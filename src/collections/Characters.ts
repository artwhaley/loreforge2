import type { CollectionConfig } from 'payload'

/**
 * Global roleplay identities. A Character is deliberately separate from its
 * controlling User and may participate in many Domains.
 */
export const Characters: CollectionConfig = {
  slug: 'characters',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'controlledBy', 'status', 'updatedAt'],
  },
  timestamps: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Character name',
    },
    {
      name: 'portrait',
      type: 'upload',
      relationTo: 'media',
      label: 'Portrait',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Public profile',
    },
    {
      name: 'controlledBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Controlled by User',
      index: true,
      admin: {
        description: 'Leave empty for an unclaimed or Domain-managed Character.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Merged', value: 'merged' },
      ],
    },
    {
      name: 'mergedInto',
      type: 'relationship',
      relationTo: 'characters',
      label: 'Merged into',
    },
    {
      name: 'aliases',
      type: 'array',
      label: 'Global aliases',
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Created by',
    },
  ],
}

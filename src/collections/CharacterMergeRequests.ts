import type { CollectionConfig } from 'payload'

export const CharacterMergeRequests: CollectionConfig = {
  slug: 'character-merge-requests',
  admin: {
    useAsTitle: 'source',
    defaultColumns: ['source', 'target', 'tenant', 'status', 'requestedAt'],
  },
  timestamps: true,
  fields: [
    { name: 'source', type: 'relationship', relationTo: 'characters', required: true, index: true },
    {
      name: 'target',
      type: 'relationship',
      relationTo: 'characters',
      label: 'Target survivor',
      admin: { description: 'Optional at request time; required before approval.' },
    },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, label: 'Requesting Domain' },
    { name: 'requestingUser', type: 'relationship', relationTo: 'users', required: true },
    { name: 'requestingCharacter', type: 'relationship', relationTo: 'characters' },
    { name: 'evidence', type: 'textarea', required: true },
    { name: 'note', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Blocked', value: 'blocked' },
      ],
    },
    { name: 'decidingPlatformAdmin', type: 'relationship', relationTo: 'users' },
    { name: 'decisionReason', type: 'textarea' },
    { name: 'requestedAt', type: 'date', required: true },
    { name: 'decidedAt', type: 'date' },
    { name: 'impactPreviewHash', type: 'text', label: 'Impact-preview snapshot/hash' },
  ],
}

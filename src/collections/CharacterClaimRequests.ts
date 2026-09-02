import type { CollectionConfig } from 'payload'

export const CharacterClaimRequests: CollectionConfig = {
  slug: 'character-claim-requests',
  admin: {
    useAsTitle: 'character',
    defaultColumns: ['character', 'claimant', 'tenant', 'status', 'requestedAt'],
  },
  timestamps: true,
  fields: [
    {
      name: 'character',
      type: 'relationship',
      relationTo: 'characters',
      required: true,
      index: true,
    },
    {
      name: 'claimant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      label: 'Domain context',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    { name: 'requestedAt', type: 'date', required: true },
    { name: 'decidedAt', type: 'date' },
    { name: 'decidedBy', type: 'relationship', relationTo: 'users', label: 'Decided by' },
    {
      name: 'decidingCharacter',
      type: 'relationship',
      relationTo: 'characters',
      label: 'Acting Character at decision',
    },
    { name: 'decisionNote', type: 'textarea', label: 'Decision note' },
  ],
}

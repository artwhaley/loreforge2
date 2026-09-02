import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Display Name',
    },
    {
      name: 'slAvatarUUID',
      type: 'text',
      label: 'Second Life avatar UUID',
      unique: true,
      index: true,
      admin: {
        description: 'Optional identity placeholder. Verification is not enabled yet.',
      },
    },
    {
      name: 'slAvatarName',
      type: 'text',
      label: 'Second Life avatar name',
    },
    {
      name: 'slVerificationState',
      type: 'select',
      label: 'Second Life verification state',
      defaultValue: 'unlinked',
      required: true,
      options: [
        { label: 'Unlinked', value: 'unlinked' },
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
      ],
    },
    {
      name: 'slVerifiedAt',
      type: 'date',
      label: 'Second Life verified at',
    },
  ],
}

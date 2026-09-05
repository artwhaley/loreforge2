import type { CollectionConfig } from 'payload'

/** Pre-Phase-8 audit S1: is the acting User platform-admin eligible? */
const actingIsPlatformAdmin = (req: { user?: { isPlatformAdmin?: boolean | null } | null }): boolean => Boolean(req.user?.isPlatformAdmin)

/** Self or platform-admin (user id may arrive as number or string). */
const selfOrPlatformAdmin = (req: { user?: { id?: number | string } | null }, id: number | string | undefined): boolean =>
  req.user != null && id != null && String(id) === String(req.user.id)

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  // Security (pre-Phase-8 audit S1): without a collection access block,
  // Payload's default `Boolean(req.user)` let ANY registered account read
  // every other account's email/profile over REST/GraphQL, and update any
  // non-field-gated field. Read/update are now self-or-platform-admin only
  // (ordinary users cannot even list accounts); create and delete stay
  // closed to the browser — registration runs through the sanctioned
  // /api/customer-register seam (overrideAccess) and Payload's first-user
  // bootstrap uses overrideAccess internally, so both keep working.
  access: {
    read: ({ req, id }) => actingIsPlatformAdmin(req) || selfOrPlatformAdmin(req, id),
    create: () => false,
    update: ({ req, id }) => actingIsPlatformAdmin(req) || selfOrPlatformAdmin(req, id),
    delete: () => false,
  },
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
      name: 'isPlatformAdmin',
      type: 'checkbox',
      access: {
        create: ({ req }) => Boolean(req.user?.isPlatformAdmin),
        update: ({ req }) => Boolean(req.user?.isPlatformAdmin),
      },
      defaultValue: false,
      label: 'Platform administrator',
      admin: { description: 'Explicit platform authority; every use is audited.' },
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

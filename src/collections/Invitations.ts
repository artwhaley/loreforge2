import type { CollectionConfig, Payload } from 'payload'

import { assertInvitationPurposeState, assertInvitationShape } from '@/lib/invitations/validate'
import { idOf, INVITATION_PURPOSES } from '@/lib/invitations/types'

const relationEqual = (left: unknown, right: unknown): boolean => idOf(left) === idOf(right)

const invitationBeforeChange = async ({ data, originalDoc, operation, req }: {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  operation: string
  req: { payload: Payload; transactionID?: number | string | Promise<number | string> }
}) => {
  const next = (data ?? {}) as Record<string, unknown>
  const previous = (originalDoc ?? {}) as Record<string, unknown>

  if (operation === 'create') {
    assertInvitationShape(next)
    const tokenHash = String(next.tokenHash ?? '')
    if (!/^[a-f0-9]{64}$/i.test(tokenHash)) throw new Error('Invitation tokenHash must be a SHA-256 hexadecimal digest.')
    const useCount = next.useCount === undefined || next.useCount === null || next.useCount === '' ? 0 : Number(next.useCount)
    if (!Number.isInteger(useCount) || useCount !== 0) throw new Error('A new Invitation must start with useCount=0.')
    const transactionID = typeof req.transactionID === 'number' || typeof req.transactionID === 'string' ? req.transactionID : null
    await assertInvitationPurposeState(req.payload, next, { transactionID })
    return data
  }

  // Purpose, target, issuer, and the stored digest are immutable. The
  // collection is access-closed, but keeping this invariant in the hook also
  // protects service calls made with overrideAccess.
  for (const field of ['purpose', 'domain', 'character', 'tokenHash', 'issuedByUser', 'issuedByCharacter', 'maxUses']) {
    if (!(field in next)) continue
    const changed = field === 'purpose' || field === 'tokenHash'
      ? String(next[field] ?? '') !== String(previous[field] ?? '')
      : !relationEqual(next[field], previous[field])
    if (changed) throw new Error(`Invitation ${field} is immutable after issuance.`)
  }

  const previousUseCount = Number(previous.useCount ?? 0)
  if ('useCount' in next) {
    const nextUseCount = Number(next.useCount)
    if (!Number.isInteger(nextUseCount) || nextUseCount < previousUseCount || nextUseCount > previousUseCount + 1) throw new Error('Invitation useCount may only advance by one.')
    if (nextUseCount === previousUseCount + 1 && !next.lastUsedAt) throw new Error('Invitation consumption must record lastUsedAt.')
  }
  const effectiveUseCount = Number(next.useCount ?? previousUseCount)
  const maxUses = next.maxUses === undefined ? previous.maxUses : next.maxUses
  if (maxUses !== null && maxUses !== undefined && maxUses !== '' && effectiveUseCount > Number(maxUses)) throw new Error('Invitation useCount cannot exceed maxUses.')
  if ('lastUsedAt' in next && next.lastUsedAt && !('useCount' in next)) throw new Error('lastUsedAt may only be set when useCount advances.')
  return data
}

/**
 * Access-closed invitation records. Customer flows use the invitation service
 * so raw token material and the token digest never cross a browser/API seam.
 */
export const Invitations: CollectionConfig = {
  slug: 'invitations',
  admin: {
    useAsTitle: 'purpose',
    defaultColumns: ['purpose', 'domain', 'character', 'issuedByUser', 'expiresAt', 'useCount', 'revokedAt'],
  },
  timestamps: true,
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [invitationBeforeChange],
  },
  indexes: [{ unique: true, fields: ['tokenHash'] }],
  fields: [
    {
      name: 'purpose',
      type: 'select',
      required: true,
      options: INVITATION_PURPOSES.map((value) => ({ label: value, value })),
      index: true,
    },
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      required: false,
      index: true,
      label: 'Domain',
    },
    {
      name: 'character',
      type: 'relationship',
      relationTo: 'characters',
      required: false,
      index: true,
      label: 'Character',
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'issuedByUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Issued by User',
    },
    {
      name: 'issuedByCharacter',
      type: 'relationship',
      relationTo: 'characters',
      required: true,
      index: true,
      label: 'Issued by acting Character',
    },
    { name: 'expiresAt', type: 'date', required: false, index: true, label: 'Expires at' },
    { name: 'revokedAt', type: 'date', required: false, index: true, label: 'Revoked at' },
    { name: 'maxUses', type: 'number', required: false, min: 1, label: 'Maximum uses' },
    { name: 'useCount', type: 'number', required: true, defaultValue: 0, min: 0, label: 'Uses' },
    { name: 'lastUsedAt', type: 'date', required: false, label: 'Last used at' },
  ],
}

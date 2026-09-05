import type { CollectionConfig } from 'payload'

import { idOf } from '@/lib/invitations/types'

const immutableOnUpdate = (data: Record<string, unknown>, original: Record<string, unknown>, fields: string[]) => {
  for (const field of fields) {
    if (!(field in data)) continue
    const left = idOf(data[field]) ?? String(data[field] ?? '')
    const right = idOf(original[field]) ?? String(original[field] ?? '')
    if (left !== right) throw new Error(`DomainBootstrapRequest ${field} is immutable after submission.`)
  }
}

export const DomainBootstrapRequests: CollectionConfig = {
  slug: 'domain-bootstrap-requests',
  admin: { useAsTitle: 'domain', defaultColumns: ['domain', 'user', 'status', 'requestedAt', 'decidedAt'] },
  timestamps: true,
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const next = (data ?? {}) as Record<string, unknown>
      const previous = (originalDoc ?? {}) as Record<string, unknown>
      if (operation === 'create') {
        if (idOf(next.domain) == null || idOf(next.user) == null || idOf(next.invitation) == null) throw new Error('A DomainBootstrapRequest requires a Domain, User, and Invitation.')
        if (String(next.status ?? 'pending') !== 'pending') throw new Error('A new DomainBootstrapRequest must be pending.')
        const invitation = await req.payload.findByID({ collection: 'invitations', id: idOf(next.invitation) as number, depth: 0, overrideAccess: true, req: typeof req.transactionID === 'number' || typeof req.transactionID === 'string' ? { transactionID: req.transactionID } : undefined }).catch(() => null) as { purpose?: unknown; domain?: unknown } | null
        if (!invitation || invitation.purpose !== 'domain_bootstrap' || idOf(invitation.domain) !== idOf(next.domain)) throw new Error('The request Invitation does not match a domain_bootstrap Invitation for this Domain.')
      } else {
        immutableOnUpdate(next, previous, ['domain', 'user', 'invitation'])
      }
      return data
    }],
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true, label: 'Domain' },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, label: 'Applicant User' },
    { name: 'invitation', type: 'relationship', relationTo: 'invitations', required: true, index: true, label: 'Invitation' },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending', options: [{ label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }, { label: 'Cancelled', value: 'cancelled' }] },
    { name: 'requestedAt', type: 'date', required: true },
    { name: 'decidedAt', type: 'date' },
    { name: 'decidedBy', type: 'relationship', relationTo: 'users', label: 'Decided by User' },
    { name: 'decidingCharacter', type: 'relationship', relationTo: 'characters', label: 'Acting platform_admin Character' },
    { name: 'decisionNote', type: 'textarea', label: 'Decision note' },
  ],
}


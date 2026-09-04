import type { CollectionConfig } from 'payload'

import { deactivateDomainParticipation, relationId } from '@/lib/domains/deactivateDomainParticipation'

/** Character participation in a Domain. This replaces spike User Memberships. */
export const DomainMemberships: CollectionConfig = {
  slug: 'domain-memberships',
  admin: {
    useAsTitle: 'character',
    defaultColumns: ['tenant', 'character', 'status', 'updatedAt'],
  },
  timestamps: true,
  // Interim authority boundary (P05R-T01): memberships change only through
  // the sanctioned /api/domain-memberships route after authorizeInterimOperation.
  // Direct REST/GraphQL/Admin create/update/delete is denied so no caller can
  // self-enroll a Character or flip a status to trigger/evade the removal
  // cascade, and no caller can read another Domain's roster rows directly.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    // P05R-T05 A: thin hook — deactivation cascades through the transactional
    // deactivateDomainParticipation service, JOINING this operation's
    // transaction via req.transactionID so the status flip, RoleAssignment /
    // Folder-rule revocations, and the durable audit event commit or roll back
    // together. The hook is the sanctioned trigger (direct status flips are
    // access-denied); the service is also standalone-safe for tests and the
    // sanctioned route.
    afterChange: [async ({ doc, previousDoc, req }) => {
      const domainId = relationId(doc.domain)
      const characterId = relationId(doc.character)
      if (doc.status === 'inactive' && previousDoc?.status !== 'inactive' && domainId && characterId) {
        await deactivateDomainParticipation({
          payload: req.payload,
          domainId,
          characterId,
          membershipId: doc.id,
          // doc.addedBy carries the actor who last touched the membership (the
          // sanctioned route stamps it on every update); normalize because Payload
          // may return it populated rather than as a bare id.
          actorUser: (req as { user?: { id: number | string } | null }).user?.id ?? relationId(doc.addedBy) ?? undefined,
          transactionID: (req as { transactionID?: number | string | null }).transactionID ?? null,
          // Test seam (P05R-T05 acceptance): lets the suite force a mid-cascade
          // failure through the real hook path and prove full rollback.
          simulateFailureAt: (req as { context?: { simulateDomainRemovalFailureAt?: 'folderRules' } }).context?.simulateDomainRemovalFailureAt ?? null,
        })
      }
      return doc
    }],
  },
  indexes: [{ unique: true, fields: ['tenant', 'character'] }],
  fields: [
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      label: 'Domain',
      admin: { description: 'Canonical Domain relationship. Populated by the Phase 3 migration.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      label: 'Legacy Tenant (migration only)',
      admin: { hidden: true },
    },
    {
      name: 'character',
      type: 'relationship',
      relationTo: 'characters',
      required: true,
      index: true,
      label: 'Character',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      name: 'addedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Added by',
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Membership note',
    },
  ],
}

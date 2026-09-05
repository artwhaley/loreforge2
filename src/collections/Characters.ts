import type { CollectionConfig } from 'payload'

import { assertCharacterKindFields, isAdminKind, CHARACTER_KINDS } from '@/lib/characters/kinds'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/**
 * Global roleplay identities. A Character is deliberately separate from its
 * controlling User and may participate in many Domains.
 *
 * P07X-T01: `kind` is exactly player | npc | domain_admin | platform_admin.
 * Administrative Characters are system-provisioned; the beforeChange hook
 * enforces controller/scope equality and exactly-one-active provisioning.
 */
export const Characters: CollectionConfig = {
  slug: 'characters',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'controlledBy', 'status', 'updatedAt'],
  },
  timestamps: true,
  access: { read: ({ req }) => Boolean((req.user as { isPlatformAdmin?: boolean } | null)?.isPlatformAdmin), create: () => false, update: () => false, delete: () => false },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const next = (data ?? {}) as Record<string, unknown>
      const previous = (originalDoc ?? {}) as Record<string, unknown> | undefined
      const kind = String(next.kind ?? previous?.kind ?? 'player')
      const controlledBy = next.controlledBy ?? previous?.controlledBy
      const administrativeDomain = next.administrativeDomain ?? previous?.administrativeDomain
      assertCharacterKindFields({ kind, controlledBy, administrativeDomain })
      const controllerId = relationId(controlledBy)
      const domainId = relationId(administrativeDomain)
      const transactionID = typeof req.transactionID === 'number' || typeof req.transactionID === 'string' ? req.transactionID : undefined
      const txReq = transactionID == null ? undefined : { transactionID }

      if (kind === 'domain_admin') {
        if (controllerId == null) throw new Error('A domain_admin Character must be controlled by the Domain owner User.')
        if (domainId == null) throw new Error('A domain_admin Character must identify exactly one administrativeDomain.')
        const [domain, existing] = await Promise.all([
          req.payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true, req: txReq }).catch(() => null) as Promise<Record<string, unknown> | null>,
          req.payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: domainId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true, req: txReq }),
        ])
        if (!domain) throw new Error('The administrativeDomain does not exist.')
        if (String((domain as { kind?: unknown }).kind ?? 'community') !== 'community') throw new Error('A domain_admin Character must administer a Community Domain.')
        const ownerId = relationId((domain as { ownerUser?: unknown }).ownerUser)
        if (ownerId == null || ownerId !== controllerId) throw new Error('The domain_admin Character controller must equal the administrativeDomain ownerUser.')
        const conflict = existing.docs[0]
        if (conflict && String(conflict.id) !== String(previous?.id)) throw new Error('A Community Domain may have exactly one active domain_admin Character.')
      }

      if (kind === 'platform_admin') {
        if (controllerId == null) throw new Error('A platform_admin Character must be controlled by a User.')
        if (domainId != null) throw new Error('A platform_admin Character cannot have an administrativeDomain.')
        const user = await req.payload.findByID({ collection: 'users', id: controllerId, depth: 0, overrideAccess: true, req: txReq }).catch(() => null) as { isPlatformAdmin?: unknown } | null
        if (!user?.isPlatformAdmin) throw new Error('Only a platform-admin-eligible User may control a platform_admin Character.')
        const existing = await req.payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'platform_admin' } }, { controlledBy: { equals: controllerId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true, req: txReq })
        const conflict = existing.docs[0]
        if (conflict && String(conflict.id) !== String(previous?.id)) throw new Error('A platform-admin-eligible User may have exactly one active platform_admin Character.')
      }

      // Ordinary Character create/update UI/API can never select an admin kind
      // without satisfying the full provisioning invariants above; additionally
      // refuse to demote an active admin Character into ordinary RP semantics
      // while it still holds the scope that only exists for admin kinds.
      if (isAdminKind(kind) && operation === 'update') {
        const memberships = await req.payload.find({ collection: 'domain-memberships', where: { character: { equals: previous?.id } }, depth: 0, limit: 1, overrideAccess: true, req: txReq })
        if (memberships.docs.length > 0) throw new Error('Administrative Characters cannot receive DomainMemberships.')
      }

      return data
    }],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Character name',
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'player',
      options: CHARACTER_KINDS.map((value) => ({ label: value, value })),
      admin: {
        description: 'player and npc use the ordinary permission path; domain_admin and platform_admin are system-provisioned administrative identities.',
      },
    },
    {
      name: 'administrativeDomain',
      type: 'relationship',
      relationTo: 'domains',
      label: 'Administrative Domain',
      index: true,
      admin: {
        description: 'Required for domain_admin Characters only; null/forbidden for every other kind.',
      },
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

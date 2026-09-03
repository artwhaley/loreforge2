import type { CollectionConfig } from 'payload'

import { assertRoleAssignment } from '@/lib/roles/invariants'

const relationId = (value: unknown): number | null => value === null || value === undefined || value === '' ? null : typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)

/** Character-to-Role membership. Folder access is a separate PermissionRule. */
export const RoleAssignments: CollectionConfig = {
  slug: 'role-assignments',
  admin: { useAsTitle: 'character', defaultColumns: ['character', 'role', 'status', 'assignedBy'] },
  timestamps: true,
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const roleId = relationId(data?.role ?? originalDoc?.role)
      const characterId = relationId(data?.character ?? originalDoc?.character)
      const status = String(data?.status ?? originalDoc?.status ?? 'active')
      if (!roleId || !characterId) throw new Error('Character and Role are required for an assignment.')
      const role = await req.payload.findByID({ collection: 'roles', id: roleId, depth: 0 })
      if (status === 'active') {
        const domainId = relationId(role.domain)
        const membership = domainId ? await req.payload.find({
          collection: 'domain-memberships',
          where: { and: [{ domain: { equals: domainId } }, { character: { equals: characterId } }, { status: { equals: 'active' } }] },
          depth: 0,
          limit: 1,
        }) : { docs: [] }
        if (!membership.docs[0]) throw new Error('A Character must be an active Domain member before receiving a Role assignment.')
      }
      assertRoleAssignment(
        { characterId, roleId },
        { id: role.id, domainId: relationId(role.domain) ?? '', subdomainId: relationId(role.subdomain), parentRoleId: relationId(role.parentRole) },
      )
      return data
    }],
  },
  fields: [
    { name: 'character', type: 'relationship', relationTo: 'characters', required: true, index: true },
    { name: 'role', type: 'relationship', relationTo: 'roles', required: true, index: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
    { name: 'startsAt', type: 'date' },
    { name: 'endsAt', type: 'date' },
    { name: 'assignedBy', type: 'relationship', relationTo: 'users', required: true },
    { name: 'assignedByCharacter', type: 'relationship', relationTo: 'characters' },
  ],
}

import type { CollectionConfig } from 'payload'

import { assertRoleHierarchy } from '@/lib/roles/invariants'

const relationId = (value: unknown): number | null => value === null || value === undefined || value === '' ? null : typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)

/** Institutional roles. parentRole is the immediate superior, never a grant. */
export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'subdomain', 'parentRole', 'active'] },
  timestamps: true,
  // Role definitions mutate only through the guarded domain services. Direct
  // REST/GraphQL/Admin access is denied for ordinary callers.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      if (operation === 'create' && !domainId) throw new Error('Every Role must belong to a Domain.')
      const subdomainId = relationId(data?.subdomain ?? originalDoc?.subdomain)
      if (!subdomainId) throw new Error('Every Community-Domain Role must belong to a Department.')
      const subdomain = await req.payload.findByID({ collection: 'subdomains', id: subdomainId, depth: 0 })
      if (relationId(subdomain.domain) !== domainId) throw new Error('A Role Department must belong to the same Domain.')
      const parentRoleId = relationId(data?.parentRole ?? originalDoc?.parentRole)
      const parent = parentRoleId ? await req.payload.findByID({ collection: 'roles', id: parentRoleId, depth: 0 }) : null
      const allRoles = await req.payload.find({ collection: 'roles', depth: 0, limit: 10000 })
      assertRoleHierarchy(
        { id: originalDoc?.id ?? 'new', domainId: domainId ?? '', subdomainId, parentRoleId },
        parent ? { id: parent.id, domainId: relationId(parent.domain) ?? '', subdomainId: relationId(parent.subdomain), parentRoleId: relationId(parent.parentRole) } : null,
        allRoles.docs.map((role) => ({ id: role.id, domainId: relationId(role.domain) ?? '', subdomainId: relationId(role.subdomain), parentRoleId: relationId(role.parentRole) })),
      )
      return data
    }],
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'subdomain', type: 'relationship', relationTo: 'subdomains', required: true, index: true, label: 'Department' },
    { name: 'name', type: 'text', required: true },
    { name: 'parentRole', type: 'relationship', relationTo: 'roles', label: 'Immediate superior' },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'system', type: 'checkbox', defaultValue: false },
  ],
}

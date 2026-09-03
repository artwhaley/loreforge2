import type { CollectionConfig } from 'payload'

import { relationId } from '@/lib/domains/deactivateDomainParticipation'

export const SubdomainMemberships: CollectionConfig = {
  slug: 'subdomain-memberships',
  labels: { singular: 'Department Membership', plural: 'Department Memberships' },
  admin: { useAsTitle: 'character', defaultColumns: ['subdomain', 'character', 'status', 'updatedAt'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['subdomain', 'character'] }],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const status = String(data?.status ?? originalDoc?.status ?? 'active')
      if (status !== 'active') return data
      const subdomainId = relationId(data?.subdomain ?? originalDoc?.subdomain)
      const characterId = relationId(data?.character ?? originalDoc?.character)
      if (!subdomainId || !characterId) return data
      const subdomain = await req.payload.findByID({ collection: 'subdomains', id: subdomainId, depth: 0 })
      const domainId = relationId(subdomain.domain)
      if (!domainId) throw new Error('A Department membership requires a Domain-owned Department.')
      const domainMembership = await req.payload.find({
        collection: 'domain-memberships',
        where: { and: [{ domain: { equals: domainId } }, { character: { equals: characterId } }, { status: { equals: 'active' } }] },
        depth: 0,
        limit: 1,
      })
      if (!domainMembership.docs[0]) throw new Error('A Character must be an active Domain member before joining a Department.')
      return data
    }],
  },
  fields: [
    { name: 'subdomain', type: 'relationship', relationTo: 'subdomains', required: true, label: 'Department' },
    { name: 'character', type: 'relationship', relationTo: 'characters', required: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
    { name: 'addedBy', type: 'relationship', relationTo: 'users' },
    { name: 'note', type: 'textarea' },
  ],
}

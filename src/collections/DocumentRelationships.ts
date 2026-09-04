import type { CollectionConfig } from 'payload'

/** Canonical linear succession edges. Supersedes is newer -> older. */
export const DocumentRelationships: CollectionConfig = {
  slug: 'document-relationships',
  admin: { useAsTitle: 'kind', defaultColumns: ['kind', 'source', 'target', 'actorUser'] },
  timestamps: true,
  // Interim authority boundary (P05R-T01): supersession edges are created and
  // corrected only through the sanctioned relationship service; direct
  // REST/GraphQL/Admin access is denied so raw edge forging is impossible.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'source', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'target', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: [{ label: 'Supersedes', value: 'supersedes' }] },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const source = data?.source ?? originalDoc?.source
      const target = data?.target ?? originalDoc?.target
      const kind = String(data?.kind ?? originalDoc?.kind ?? '')
      if (!data?.domain && !originalDoc?.domain) throw new Error('Document relationships require a Domain.')
      if (source && target) {
        if (String(source) === String(target)) throw new Error('A Document cannot relate to itself.')
        if (kind !== 'supersedes') throw new Error('Only supersedes relationships are supported.')
        const sourceDoc = await req.payload.findByID({ collection: 'documents', id: typeof source === 'object' && 'id' in source ? (source as { id: number }).id : source, depth: 0, overrideAccess: true })
        const targetDoc = await req.payload.findByID({ collection: 'documents', id: typeof target === 'object' && 'id' in target ? (target as { id: number }).id : target, depth: 0, overrideAccess: true })
        const domainId = typeof data?.domain === 'object' && data.domain && 'id' in data.domain ? (data.domain as { id: number }).id : data?.domain ?? originalDoc?.domain
        const sourceDomain = typeof sourceDoc.domain === 'object' ? sourceDoc.domain?.id : sourceDoc.domain
        const targetDomain = typeof targetDoc.domain === 'object' ? targetDoc.domain?.id : targetDoc.domain
        if (Number(sourceDomain) !== Number(domainId) || Number(targetDomain) !== Number(domainId)) throw new Error('Related Documents must share the relationship Domain.')
      }
      return data
    }],
  },
}

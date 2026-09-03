import type { CollectionConfig } from 'payload'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

/** Explicit Document -> Domain Tag links, not free-form metadata fields. */
export const DocumentTags: CollectionConfig = {
  slug: 'document-tags',
  admin: { useAsTitle: 'document', defaultColumns: ['document', 'tag', 'domain'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['document', 'tag'] }],
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true, admin: { readOnly: true } },
    { name: 'document', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'tag', type: 'relationship', relationTo: 'tags', required: true, index: true },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: false, admin: { readOnly: true } },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', required: false, admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const documentId = relationId(data?.document ?? originalDoc?.document)
      const tagId = relationId(data?.tag ?? originalDoc?.tag)
      if (!domainId || !documentId || !tagId) throw new Error('A Document Tag link requires a Domain, Document, and Tag.')
      const [document, tag] = await Promise.all([
        req.payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true }),
        req.payload.findByID({ collection: 'tags', id: tagId, depth: 0, overrideAccess: true }),
      ])
      if (relationId(document.domain) !== domainId || relationId(tag.domain) !== domainId) throw new Error('Document Tags must stay inside one Domain.')
      return { ...data, domain: domainId }
    }],
  },
}

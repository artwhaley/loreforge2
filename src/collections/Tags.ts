import type { CollectionConfig } from 'payload'
import { normalizeTagName } from '@/lib/documents/linkInvariants'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

/** Domain vocabulary. `normalizedName` keeps lookup uniqueness case-insensitive. */
export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['domain', 'normalizedName'] }],
  // Interim authority boundary (P05R-T01): Tag vocabulary mutates through the
  // sanctioned filing/link service only; direct REST/GraphQL/Admin access is
  // denied for ordinary callers.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'normalizedName', type: 'text', required: true, index: true, admin: { hidden: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const name = String(data?.name ?? originalDoc?.name ?? '').trim()
      if (!domainId || !name) throw new Error('A Tag requires a Domain and a nonblank name.')
      const normalizedName = normalizeTagName(name)
      if (operation === 'create' || data?.name !== undefined || data?.domain !== undefined) {
        const existing = await req.payload.find({ collection: 'tags', where: { and: [{ domain: { equals: domainId } }, { normalizedName: { equals: normalizedName } }] }, depth: 0, limit: 1, overrideAccess: true })
        if (existing.docs.some((tag) => Number(tag.id) !== Number(originalDoc?.id))) throw new Error('A Tag with this name already exists in the Domain.')
      }
      return { ...data, domain: domainId, name, normalizedName }
    }],
  },
}

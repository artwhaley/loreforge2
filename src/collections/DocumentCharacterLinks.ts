import type { CollectionConfig } from 'payload'
import { assertCharacterLinkInput } from '@/lib/documents/linkInvariants'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

/** Typed visible Character credits, deliberately separate from provenance. */
export const DocumentCharacterLinks: CollectionConfig = {
  slug: 'document-character-links',
  admin: { useAsTitle: 'character', defaultColumns: ['document', 'character', 'kind', 'relationshipLabel'] },
  timestamps: true,
  indexes: [{ unique: true, fields: ['document', 'character', 'kind'] }],
  // Interim authority boundary (P05R-T01): links mutate only through the
  // sanctioned link service; direct REST/GraphQL/Admin access is denied.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true, admin: { readOnly: true } },
    { name: 'document', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'character', type: 'relationship', relationTo: 'characters', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: [{ label: 'Prepared by', value: 'prepared_by' }, { label: 'Concerns', value: 'concerns' }] },
    { name: 'relationshipLabel', type: 'text', label: 'Relationship (Concerns only)' },
    { name: 'requiredByCreate', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: false, admin: { readOnly: true } },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', required: false, admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const documentId = relationId(data?.document ?? originalDoc?.document)
      const characterId = relationId(data?.character ?? originalDoc?.character)
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const kind = String(data?.kind ?? originalDoc?.kind ?? '')
      if (!documentId || !characterId || !domainId) throw new Error('A Character link requires a Domain, Document, Character, and valid kind.')
      assertCharacterLinkInput({ kind, relationshipLabel: data?.relationshipLabel ?? originalDoc?.relationshipLabel })
      // The hook can run inside the caller's transaction (e.g. the form-filing
      // flow creates the Document and its links atomically), so every lookup
      // must carry `req` — otherwise Payload auto-commits a separate read that
      // cannot see the still-uncommitted Document and this hook throws
      // NotFound. See src/lib/db/transactions.ts.
      const [document, character] = await Promise.all([
        req.payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true, req }),
        req.payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true, req }),
      ])
      if (relationId(document.domain) !== domainId) throw new Error('Character links must stay inside the Document Domain.')
      if (character.status !== 'active') throw new Error('Only active Characters may be linked.')
      const nextRequired = Boolean(data?.requiredByCreate ?? originalDoc?.requiredByCreate ?? false)
      if (originalDoc?.requiredByCreate && data?.requiredByCreate === false) throw new Error('The required creation credit cannot be removed.')
      if (nextRequired && kind !== 'prepared_by') throw new Error('Only Prepared by credits may be required at creation.')
      return {
        ...data,
        domain: domainId,
        relationshipLabel: kind === 'concerns' ? String(data?.relationshipLabel ?? originalDoc?.relationshipLabel ?? '').trim() || undefined : undefined,
      }
    }],
    beforeDelete: [async ({ id, req }) => {
      const link = await req.payload.findByID({ collection: 'document-character-links', id, depth: 0, overrideAccess: true, req }).catch(() => null)
      const context = req.context as Record<string, unknown> | undefined
      if (link?.requiredByCreate && context?.systemCleanup !== true) throw new Error('The active Character creation credit cannot be removed.')
    }],
  },
}

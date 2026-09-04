import type { CollectionConfig } from 'payload'

import { assertSupersessionInvariants, type SupersedesEdgeRow } from '@/lib/documents/relationshipInvariants'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

/**
 * Canonical linear succession edges. Supersedes is newer -> older.
 *
 * P05R-T02: DB unique indexes back the one-predecessor/one-successor chain at
 * the storage layer (one supersedes edge per source, one per target), and the
 * beforeChange hook re-runs the same linear-chain invariants the service
 * preflights — self-link, second predecessor, second successor, and cycles —
 * as defense in depth against direct writes. Direct REST/GraphQL/Admin writes
 * are closed by access config; sanctioned writes flow through the service.
 */
export const DocumentRelationships: CollectionConfig = {
  slug: 'document-relationships',
  admin: { useAsTitle: 'kind', defaultColumns: ['kind', 'source', 'target', 'actorUser'] },
  timestamps: true,
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    { unique: true, fields: ['source', 'kind'] },
    { unique: true, fields: ['target', 'kind'] },
  ],
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'source', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'target', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: [{ label: 'Supersedes', value: 'supersedes' }] },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
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
        const edgesResult = await req.payload.find({
          collection: 'document-relationships',
          where: { and: [{ kind: { equals: 'supersedes' } }, { domain: { equals: domainId } }] },
          depth: 0,
          limit: 5000,
          overrideAccess: true,
        })
        const edges: SupersedesEdgeRow[] = edgesResult.docs.map((edge) => ({
          id: edge.id,
          sourceId: relationId(edge.source) ?? '',
          targetId: relationId(edge.target) ?? '',
        })).filter((edge) => edge.sourceId !== '' && edge.targetId !== '')
        assertSupersessionInvariants({
          sourceId: relationId(source) ?? '',
          targetId: relationId(target) ?? '',
          edges,
          excludeEdgeId: operation === 'update' ? originalDoc?.id : null,
        })
      }
      return data
    }],
  },
}

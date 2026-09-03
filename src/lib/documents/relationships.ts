import type { Payload } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { recordDocumentProvenance } from '@/lib/documents/provenance'
import { assertNoSupersedesCycle, assertRelationshipInput, type RelationshipKind } from '@/lib/documents/relationshipInvariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

type RelationshipActor = { userId: number | string; characterId?: number | string | null }

async function requireAdmin(payload: Payload, actor: RelationshipActor, domainId: number | string) {
  const authorized = await authorizeInterimOperation(payload, { userId: actor.userId, activeCharacterId: actor.characterId }, domainId)
  if (authorized !== true) throw new Error(authorized)
}

async function getDocument(payload: Payload, id: number | string, domainId: number | string) {
  const document = await payload.findByID({ collection: 'documents', id, depth: 0, overrideAccess: true })
  if (!document || idOf(document.domain) !== Number(domainId)) throw new Error('Both Documents must belong to the selected Domain.')
  return document
}

export async function getDocumentRelationships(payload: Payload, documentId: number | string) {
  const result = await payload.find({ collection: 'document-relationships', where: { or: [{ source: { equals: documentId } }, { target: { equals: documentId } }] }, depth: 1, limit: 500, overrideAccess: true })
  return result
}

export async function addDocumentRelationship(args: { payload: Payload; domainId: number | string; sourceId: number | string; targetId: number | string; kind: RelationshipKind; label?: string | null; actor: RelationshipActor; skipAuthorization?: boolean }) {
  const { payload, domainId, sourceId, targetId, kind, actor } = args
  assertRelationshipInput({ sourceId, targetId, kind, label: args.label })
  const [source, target] = await Promise.all([getDocument(payload, sourceId, domainId), getDocument(payload, targetId, domainId)])
  if (!args.skipAuthorization) await requireAdmin(payload, actor, domainId)
  let canonicalSource = Number(source.id)
  let canonicalTarget = Number(target.id)
  if (kind === 'grouped' && canonicalSource > canonicalTarget) [canonicalSource, canonicalTarget] = [canonicalTarget, canonicalSource]
  const duplicate = await payload.find({ collection: 'document-relationships', where: { and: [{ source: { equals: canonicalSource } }, { target: { equals: canonicalTarget } }, { kind: { equals: kind } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (duplicate.docs[0]) return duplicate.docs[0]
  if (kind === 'supersedes') {
    const successor = await payload.find({ collection: 'document-relationships', where: { and: [{ kind: { equals: 'supersedes' } }, { target: { equals: canonicalTarget } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (successor.docs[0]) throw new Error('An older Document can have only one direct superseding successor; remove the existing one first.')
    const edges = await payload.find({ collection: 'document-relationships', where: { and: [{ domain: { equals: domainId } }, { kind: { equals: 'supersedes' } }] }, depth: 0, limit: 5000, overrideAccess: true })
    const newerToOlder = new Map<string, string>()
    for (const edge of edges.docs) {
      const newer = idOf(edge.source)
      const older = idOf(edge.target)
      if (newer !== null && older !== null) newerToOlder.set(String(newer), String(older))
    }
    assertNoSupersedesCycle(canonicalSource, canonicalTarget, newerToOlder)
  }
  const created = await payload.create({ collection: 'document-relationships', overrideAccess: true, data: { domain: Number(domainId), source: canonicalSource, target: canonicalTarget, kind, label: kind === 'grouped' ? String(args.label ?? '').trim() : undefined, actorUser: Number(actor.userId), actorCharacter: actor.characterId == null ? undefined : Number(actor.characterId) } })
  const context = { action: 'added', kind, relatedDocumentId: canonicalTarget, label: kind === 'grouped' ? String(args.label ?? '').trim() : undefined }
  await recordDocumentProvenance({ payload, domainId, documentId: source.id, eventType: kind === 'supersedes' ? 'superseded' : 'relationship_added', actorUserId: actor.userId, actorCharacterId: actor.characterId, context })
  await recordDocumentProvenance({ payload, domainId, documentId: target.id, eventType: 'relationship_added', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { ...context, relatedDocumentId: source.id } })
  return created
}

export async function removeDocumentRelationship(args: { payload: Payload; domainId: number | string; relationshipId: number | string; actor: RelationshipActor; skipAuthorization?: boolean }) {
  const { payload, domainId, relationshipId, actor } = args
  const relation = await payload.findByID({ collection: 'document-relationships', id: relationshipId, depth: 0, overrideAccess: true })
  if (!relation || idOf(relation.domain) !== Number(domainId)) throw new Error('Relationship not found.')
  if (!args.skipAuthorization) await requireAdmin(payload, actor, domainId)
  await payload.delete({ collection: 'document-relationships', id: relationshipId, overrideAccess: true })
  const sourceId = idOf(relation.source)
  const targetId = idOf(relation.target)
  for (const documentId of [sourceId, targetId]) if (documentId !== null) await recordDocumentProvenance({ payload, domainId, documentId, eventType: 'relationship_removed', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { relationshipId: Number(relationshipId), kind: relation.kind } })
}

import type { Payload } from 'payload'

import { requirePermission } from '@/lib/authz/evaluate'
import { runInTransaction } from '@/lib/db/transactions'
import { canSupersedeDocument } from '@/lib/documents/lifecycle'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { assertRelationshipInput, assertSupersessionInvariants, type RelationshipKind, type SupersedesEdgeRow } from '@/lib/documents/relationshipInvariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

type RelationshipActor = { userId: number | string; characterId?: number | string | null }

// P05R-T05: runInTransaction moved to the shared src/lib/db/transactions
// module so domain services can reuse it without importing the documents layer.
export { runInTransaction }

async function requireAdmin(payload: Payload, actor: RelationshipActor, domainId: number | string, documentIds: Array<number | string>) {
  for (const documentId of documentIds) await requirePermission({ payload, actor: { userId: actor.userId, activeCharacterId: actor.characterId }, domainId, capability: 'edit_document', resource: { type: 'Document', id: documentId } })
}

async function getDocument(payload: Payload, id: number | string, domainId: number | string, transactionID?: number | string | null) {
  const document = await payload.findByID({ collection: 'documents', id, depth: 0, overrideAccess: true, req: transactionID == null ? undefined : { transactionID } })
  if (!document || idOf(document.domain) !== Number(domainId)) throw new Error('Both Documents must belong to the selected Domain.')
  return document
}

export async function getDocumentRelationships(payload: Payload, documentId: number | string) {
  const result = await payload.find({ collection: 'document-relationships', where: { or: [{ source: { equals: documentId } }, { target: { equals: documentId } }] }, depth: 1, limit: 500, overrideAccess: true })
  return result
}

async function allSupersedesEdges(payload: Payload, domainId: number | string, transactionID?: number | string | null): Promise<SupersedesEdgeRow[]> {
  const result = await payload.find({
    collection: 'document-relationships',
    where: { and: [{ domain: { equals: domainId } }, { kind: { equals: 'supersedes' } }] },
    depth: 0,
    limit: 5000,
    overrideAccess: true,
    req: transactionID == null ? undefined : { transactionID },
  })
  return result.docs.map((edge) => ({ id: edge.id, sourceId: idOf(edge.source) ?? '', targetId: idOf(edge.target) ?? '' })).filter((edge) => edge.sourceId !== '' && edge.targetId !== '')
}

export async function addDocumentRelationship(args: {
  payload: Payload
  domainId: number | string
  sourceId: number | string
  targetId: number | string
  kind: RelationshipKind
  label?: string | null
  actor: RelationshipActor
  skipAuthorization?: boolean
  transactionID?: number | string | null
}) {
  const { payload, domainId, sourceId, targetId, kind, actor } = args
  assertRelationshipInput({ sourceId, targetId, kind, label: args.label })
  // P05R-T02 A: authorize and preflight BEFORE any write, and the
  // predecessor's lifecycle eligibility is enforced centrally here so no path
  // (UI, route, raw service call) can supersede a Draft or Pending record.
  const [source, target] = await Promise.all([getDocument(payload, sourceId, domainId, args.transactionID), getDocument(payload, targetId, domainId, args.transactionID)])
  if (kind === 'supersedes' && !canSupersedeDocument(String(target.lifecycle))) {
    throw new Error('Only Filed or already-Locked records may be superseded; Draft records are edited, not superseded.')
  }
  if (!args.skipAuthorization) await requireAdmin(payload, actor, domainId, [sourceId, targetId])

  // P05R-T02 B: everything after the preflights is ONE real DB transaction —
  // the edge, the predecessor lock, and the provenance on both records commit
  // together or nothing does. Callers that already opened a transaction (the
  // supersede-create flow in archive.ts) join it by passing transactionID;
  // standalone callers (the sanctioned relationship route, tests) get their
  // own transaction here, so no route-level add can strand a lock or a half
  // relationship.
  const execute = async (transactionID: number | string | null) => {
    const txReq = transactionID == null ? undefined : { transactionID }
    const canonicalSource = Number(source.id)
    const canonicalTarget = Number(target.id)
    const duplicate = await payload.find({ collection: 'document-relationships', where: { and: [{ source: { equals: canonicalSource } }, { target: { equals: canonicalTarget } }, { kind: { equals: kind } }] }, depth: 0, limit: 1, overrideAccess: true, req: txReq })
    if (duplicate.docs[0]) return duplicate.docs[0]
    const edges = await allSupersedesEdges(payload, domainId, transactionID)
    assertSupersessionInvariants({ sourceId: canonicalSource, targetId: canonicalTarget, edges })

    const wasLocked = String(target.lifecycle) === 'locked'
    const priorLifecycle = String(target.lifecycle) === 'locked' ? 'locked' : 'filed'
    const created = await payload.create({ collection: 'document-relationships', overrideAccess: true, req: txReq, data: { domain: Number(domainId), source: canonicalSource, target: canonicalTarget, kind, lockApplied: kind === 'supersedes' && !wasLocked, priorLifecycle, actorUser: Number(actor.userId), actorCharacter: actor.characterId == null ? undefined : Number(actor.characterId) } })

    // P05R-T02 F: the predecessor's own timeline must show that it was
    // superseded and by whom. When it is not already Locked, lock it through
    // the supersedesLock seam (narrowed: only Filed -> Locked); the
    // superseded event is always recorded on the predecessor, whether or not a
    // new lock was made.
    if (kind === 'supersedes') {
      if (!wasLocked) {
        await payload.update({ collection: 'documents', id: target.id, overrideAccess: true, req: txReq, context: { supersedesLock: true }, data: { lifecycle: 'locked' } })
        await recordDocumentProvenance({ payload, domainId, documentId: target.id, eventType: 'locked', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { reason: 'superseded', supersedingDocumentId: canonicalSource }, revisionId: await latestDocumentRevisionId(payload, target.id, transactionID), transactionID })
      }
      await recordDocumentProvenance({ payload, domainId, documentId: target.id, eventType: 'superseded', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { supersedingDocumentId: canonicalSource }, revisionId: await latestDocumentRevisionId(payload, target.id, transactionID), transactionID })
    }
    await recordDocumentProvenance({ payload, domainId, documentId: source.id, eventType: kind === 'supersedes' ? 'superseded' : 'relationship_added', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { action: 'added', kind, relatedDocumentId: canonicalTarget }, revisionId: await latestDocumentRevisionId(payload, source.id, transactionID), transactionID })
    await recordDocumentProvenance({ payload, domainId, documentId: target.id, eventType: 'relationship_added', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { action: 'added', kind, relatedDocumentId: canonicalSource }, revisionId: await latestDocumentRevisionId(payload, target.id, transactionID), transactionID })
    return created
  }
  if (args.transactionID != null) return execute(args.transactionID)
  return runInTransaction(payload, (transactionID) => execute(transactionID))
}

/**
 * Audited correction (P05R-T02 E) replacing the old dead-end remove.
 *
 * Removing a supersedes edge must not strand the older Document in Locked:
 * if no superseding successor remains, the predecessor returns to Filed
 * through the sanctioned lifecycle rule (Locked -> Filed) and the correction
 * is provenance-recorded on both endpoints. Runs transactionally.
 */
export async function removeDocumentRelationship(args: { payload: Payload; domainId: number | string; relationshipId: number | string; actor: RelationshipActor; skipAuthorization?: boolean }) {
  const { payload, domainId, relationshipId, actor } = args
  const relation = await payload.findByID({ collection: 'document-relationships', id: relationshipId, depth: 0, overrideAccess: true })
  if (!relation || idOf(relation.domain) !== Number(domainId)) throw new Error('Relationship not found.')
  if (!args.skipAuthorization) await requireAdmin(payload, actor, domainId, [idOf(relation.source) ?? '', idOf(relation.target) ?? ''])
  const sourceId = idOf(relation.source)
  const targetId = idOf(relation.target)
  const kind = String(relation.kind ?? 'supersedes')

  await runInTransaction(payload, async (transactionID) => {
    const txReq = { transactionID }
    await payload.delete({ collection: 'document-relationships', id: relationshipId, overrideAccess: true, req: txReq })
    if (kind === 'supersedes' && targetId !== null) {
      const remaining = await payload.find({ collection: 'document-relationships', where: { and: [{ kind: { equals: 'supersedes' } }, { target: { equals: targetId } }] }, depth: 0, limit: 1, overrideAccess: true, req: txReq })
      if (remaining.docs.length === 0) {
        const target = await payload.findByID({ collection: 'documents', id: targetId, depth: 0, overrideAccess: true, req: txReq }).catch(() => null) as { lifecycle?: unknown } | null
        const lockApplied = Boolean((relation as { lockApplied?: unknown }).lockApplied)
        const priorLifecycle = String((relation as { priorLifecycle?: unknown }).priorLifecycle ?? 'filed')
        if (target && String(target.lifecycle) === 'locked' && lockApplied) {
          // The actor was verified above; this is a sanctioned correction, not
          // an ordinary privileged transition.
          const restoreLifecycle = priorLifecycle === 'locked' ? 'locked' : 'filed'
          if (restoreLifecycle !== 'locked') {
            await payload.update({ collection: 'documents', id: targetId, overrideAccess: true, req: txReq, context: { authorizationChecked: true }, data: { lifecycle: restoreLifecycle } })
            await recordDocumentProvenance({ payload, domainId, documentId: targetId, eventType: 'unlocked', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { reason: 'supersession-corrected', relationshipId: Number(relationshipId) }, revisionId: await latestDocumentRevisionId(payload, targetId, transactionID), transactionID })
          }
        }
      }
    }
    for (const documentId of [sourceId, targetId]) {
      if (documentId !== null) {
        await recordDocumentProvenance({ payload, domainId, documentId, eventType: 'relationship_removed', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { relationshipId: Number(relationshipId), kind, correction: true }, revisionId: await latestDocumentRevisionId(payload, documentId, transactionID), transactionID })
      }
    }
  })
}

/** Coherent correction entry point used by administrators (alias for clarity). */
export const correctSupersession = removeDocumentRelationship

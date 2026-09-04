import type { Payload } from 'payload'


// P05R-T04 G: the vocabulary is exactly the Architecture Contract's
// minimum event list. `shared`/`share_revoked` stay reserved but unused
// (CC-2026-09-03-04); `moved`/`copied`/`copied_from`/`copied_to`/`deleted`
// and the kebab spellings were pruned (stored-row check: zero rows used them).
export const PROVENANCE_EVENT_TYPES = [
  'created', 'edited', 'submitted', 'withdrawn', 'approved', 'rejected',
  'filed', 'locked', 'unlocked', 'soft_deleted', 'restored',
  'shared', 'share_revoked',
  'relationship_added', 'relationship_removed', 'superseded',
  'tag_changed', 'character_link_changed',
  'imported', 'exported', 'sl_transfer',
] as const

export type ProvenanceEventType = (typeof PROVENANCE_EVENT_TYPES)[number]

export type ProvenanceContext = Record<string, unknown>

/** Stable oldest-first ordering; ID breaks ties when timestamps are equal. */
export const provenanceTimelineSort: string[] = ['occurredAt', 'id']

export type ProvenanceInput = {
  payload?: Payload
  domainId: number | string
  documentId: number | string
  eventType: ProvenanceEventType
  actorUserId?: number | string | null
  actorCharacterId?: number | string | null
  context?: ProvenanceContext
  revisionId?: number | string | null
  sourceDescriptor?: string | null
  /** Join an explicit DB transaction started by the caller (P05R-T02). */
  transactionID?: number | string | null
}

/** The sole application writer for Document provenance. */
export async function recordDocumentProvenance(input: ProvenanceInput) {
  const payload = input.payload ?? (await (await import('@/lib/payload')).getLorePayload())
  const req = input.transactionID == null ? undefined : { transactionID: input.transactionID }
  return payload.create({
    collection: 'document-provenance-events',
    overrideAccess: true,
    depth: 0,
    req,
    data: {
      domain: Number(input.domainId),
      document: Number(input.documentId),
      actorUser: input.actorUserId == null ? undefined : Number(input.actorUserId),
      actorCharacter: input.actorCharacterId == null ? undefined : Number(input.actorCharacterId),
      eventType: input.eventType,
      occurredAt: new Date().toISOString(),
      context: input.context,
      revisionId: input.revisionId == null ? undefined : String(input.revisionId),
      sourceDescriptor: input.sourceDescriptor ?? undefined,
    },
  })
}

/** Find the newest Payload revision for linking an edit/create event. */
export async function latestDocumentRevisionId(payload: Payload, documentId: number | string, transactionID?: number | string | null): Promise<string | null> {
  const result = await payload.findVersions({ collection: 'documents', where: { parent: { equals: documentId } }, depth: 0, limit: 1, sort: '-createdAt', req: transactionID == null ? undefined : { transactionID } })
  return result.docs[0]?.id ? String(result.docs[0].id) : null
}

export function describeProvenanceEvent(eventType: ProvenanceEventType, context?: ProvenanceContext): string {
  switch (eventType) {
    case 'created': return 'created this record'
    case 'edited': return 'edited the record'
    case 'submitted': return 'submitted the record for review'
    case 'withdrawn': return 'withdrew the record from review'
    case 'filed': return 'filed the record'
    case 'approved': return 'approved the record'
    case 'rejected': return context?.note ? `returned the record to Draft: ${String(context.note)}` : 'returned the record to Draft'
    case 'locked': return 'locked the record'
    case 'unlocked': return 'unlocked the record'
    case 'soft_deleted': return 'soft-deleted the record'
    case 'restored': return 'restored the record'
    case 'shared': return 'shared the record'
    case 'share_revoked': return 'revoked a record share'
    case 'character_link_changed': return context?.action === 'detached' ? 'removed a Character link' : 'added a Character link'
    case 'tag_changed': return context?.action === 'detached' ? 'removed a tag' : 'added a tag'
    case 'relationship_added': return 'added a record relationship'
    case 'relationship_removed': return 'removed a record relationship'
    case 'superseded': return context?.supersedingDocumentId ? 'was superseded by a newer record' : 'superseded an older record'
    case 'imported': return 'imported the record'
    case 'exported': return 'exported the record'
    case 'sl_transfer': return 'transferred the record across Second Life'
    default: return 'changed the record'
  }
}

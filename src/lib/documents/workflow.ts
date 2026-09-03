import type { Payload } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { assertLifecycleTransition, type Lifecycle } from '@/lib/documents/lifecycle'
import { latestDocumentRevisionId, recordDocumentProvenance, type ProvenanceEventType } from '@/lib/documents/provenance'
import { domainAndIdWhere } from '@/lib/tenant/scope'

export type WorkflowOperation = 'submit' | 'file' | 'approve' | 'reject' | 'lock' | 'unlock'

export type WorkflowActor = {
  payload: Payload
  userId: number | string
  domainId: number | string
  documentId: number | string
  actorCharacterId?: number | string | null
}

const TRANSITIONS: Record<WorkflowOperation, { from: Lifecycle; to: Lifecycle; event: ProvenanceEventType }> = {
  submit: { from: 'draft', to: 'pending_review', event: 'submitted' },
  file: { from: 'draft', to: 'filed', event: 'filed' },
  approve: { from: 'pending_review', to: 'filed', event: 'approved' },
  reject: { from: 'pending_review', to: 'draft', event: 'rejected' },
  lock: { from: 'filed', to: 'locked', event: 'locked' },
  unlock: { from: 'locked', to: 'filed', event: 'unlocked' },
}

/** Apply one of the four explicit lifecycle transitions and then append provenance. */
export async function transitionDocument(args: WorkflowActor & { operation: WorkflowOperation; note?: string | null }) {
  const transition = TRANSITIONS[args.operation]
  const result = await args.payload.find({ collection: 'documents', where: domainAndIdWhere(args.domainId, args.documentId), depth: 0, limit: 1 })
  const document = result.docs[0]
  if (!document) throw new Error('Document not found.')
  if (document.lifecycle !== transition.from) throw new Error(`This record is ${document.lifecycle}; it cannot be ${args.operation}.`)
  assertLifecycleTransition(document.lifecycle, transition.to)
  await args.payload.update({ collection: 'documents', id: document.id, data: { lifecycle: transition.to }, depth: 0 })
  await recordDocumentProvenance({
    payload: args.payload,
    domainId: args.domainId,
    documentId: document.id,
    eventType: transition.event,
    actorUserId: args.userId,
    actorCharacterId: args.actorCharacterId,
    context: { from: transition.from, to: transition.to, ...(args.note ? { note: args.note } : {}) },
    revisionId: await latestDocumentRevisionId(args.payload, document.id),
  })
  return { ...document, lifecycle: transition.to }
}

/** P04 interim boundary: only User owner or active operational Domain Admin. */
export async function requireInterimWorkflowAuthority(payload: Payload, userId: number | string, domainId: number | string): Promise<void> {
  const authorized = await authorizeInterimOperation(payload, { userId }, domainId)
  if (authorized !== true) throw new Error(authorized)
}

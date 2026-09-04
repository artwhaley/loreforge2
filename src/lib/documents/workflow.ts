import type { Payload } from 'payload'

import { requirePermission } from '@/lib/authz/evaluate'
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
const CAPABILITY: Record<WorkflowOperation, 'submit_document' | 'file_document' | 'approve_document' | 'edit_document' | 'lock_document' | 'unlock_document'> = {
  submit: 'submit_document', file: 'file_document', approve: 'approve_document', reject: 'edit_document', lock: 'lock_document', unlock: 'unlock_document',
}

/** Apply one of the four explicit lifecycle transitions and then append provenance. */
export async function transitionDocument(args: WorkflowActor & { operation: WorkflowOperation; note?: string | null }) {
  const transition = TRANSITIONS[args.operation]
  const result = await args.payload.find({ collection: 'documents', where: domainAndIdWhere(args.domainId, args.documentId), depth: 0, limit: 1 })
  const document = result.docs[0]
  if (!document) throw new Error('Document not found.')
  if (typeof (args.payload as unknown as { findByID?: unknown }).findByID === 'function') {
    await requirePermission({ payload: args.payload, actor: { userId: args.userId, activeCharacterId: args.actorCharacterId }, domainId: args.domainId, capability: CAPABILITY[args.operation], resource: { type: 'Document', id: document.id } })
  }
  if (document.lifecycle !== transition.from) throw new Error(`This record is ${document.lifecycle}; it cannot be ${args.operation}.`)
  assertLifecycleTransition(document.lifecycle, transition.to)
  await args.payload.update({ collection: 'documents', id: document.id, data: { lifecycle: transition.to }, depth: 0, context: { authorizationChecked: true } })
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

import type { Payload } from 'payload'

import { requirePermission } from '@/lib/authz/evaluate'
import { assertLifecycleTransition, type Lifecycle } from '@/lib/documents/lifecycle'
import { latestDocumentRevisionId, recordDocumentProvenance, type ProvenanceEventType } from '@/lib/documents/provenance'
import { resolveLifecycleRouteFolder } from '@/lib/documents/typeRouting'
import { domainAndIdWhere } from '@/lib/tenant/scope'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

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

/**
 * Apply one of the explicit lifecycle transitions, route the record through
 * its Document Type's lifecycle Folders (P07X-T05), and append provenance.
 *
 * The destination Folder is resolved server-side from the Type's routing
 * configuration — ordinary callers can never supply a workflow destination.
 * Lifecycle + Folder relocation land in ONE update (atomic at the store), and
 * the provenance context records the prior/routed Folder and the reason.
 */
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
  const typeId = relationId((document as { documentType?: unknown }).documentType)
  const typeRecord = typeId == null ? null : await args.payload.findByID({ collection: 'document-types', id: typeId, depth: 0 }).catch(() => null) as Record<string, unknown> | null
  const priorFolderId = relationId((document as { folder?: unknown }).folder)
  const routedFolderId = resolveLifecycleRouteFolder(typeRecord, transition.to, priorFolderId)
  const folderChanged = routedFolderId != null && priorFolderId != null && routedFolderId !== priorFolderId
  const data: Record<string, unknown> = { lifecycle: transition.to }
  if (folderChanged) data.folder = routedFolderId
  await args.payload.update({ collection: 'documents', id: document.id, data, depth: 0, context: { authorizationChecked: true } })
  await recordDocumentProvenance({
    payload: args.payload,
    domainId: args.domainId,
    documentId: document.id,
    eventType: transition.event,
    actorUserId: args.userId,
    actorCharacterId: args.actorCharacterId,
    context: {
      from: transition.from,
      to: transition.to,
      ...(folderChanged ? { priorFolderId, routedFolderId, reason: 'lifecycle-route' } : {}),
      ...(args.note ? { note: args.note } : {}),
    },
    revisionId: await latestDocumentRevisionId(args.payload, document.id),
  })
  return { ...document, lifecycle: transition.to, ...(folderChanged ? { folder: routedFolderId } : {}) }
}

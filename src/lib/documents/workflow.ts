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

/**
 * P08X-T02 vocabulary. Stage moves: submit (Draft -> Submitted), direct file
 * (Draft -> Filed), approve (Submitted -> Filed), reject (Submitted -> Draft).
 * Deprecate (Filed -> Deprecated) and restore (Deprecated -> Filed) arrive
 * with the P08X-T07 transition surface. Lock/unlock are NOT stage moves — they
 * toggle the document's locked boolean (exactly one meaning: not editable).
 */
const STAGE_TRANSITIONS: Record<Exclude<WorkflowOperation, 'lock' | 'unlock'>, { from: Lifecycle; to: Lifecycle; event: ProvenanceEventType }> = {
  submit: { from: 'draft', to: 'submitted', event: 'submitted' },
  file: { from: 'draft', to: 'filed', event: 'filed' },
  approve: { from: 'submitted', to: 'filed', event: 'approved' },
  reject: { from: 'submitted', to: 'draft', event: 'rejected' },
}
const CAPABILITY: Record<WorkflowOperation, 'submit_document' | 'file_document' | 'approve_document' | 'edit_document' | 'lock_document' | 'unlock_document'> = {
  submit: 'submit_document', file: 'file_document', approve: 'approve_document', reject: 'edit_document', lock: 'lock_document', unlock: 'unlock_document',
}

/**
 * Apply one explicit workflow step. Stage moves route the record through its
 * Document Type's lifecycle Folders and append provenance; lock/unlock toggle
 * the locked boolean and never move stages. The destination Folder is resolved
 * server-side from the Type's routing configuration — ordinary callers can
 * never supply a workflow destination.
 */
async function applyTransition(args: WorkflowActor & { operation: WorkflowOperation; note?: string | null }, transactionID?: number | string | null) {
  const { operation } = args
  const payload = args.payload
  const req = transactionID == null ? undefined : { transactionID }
  const result = await payload.find({ collection: 'documents', where: domainAndIdWhere(args.domainId, args.documentId), depth: 0, limit: 1, ...(req ? { req } : {}) })
  const document = result.docs[0]
  if (!document) throw new Error('Document not found.')

  // P08X-T02: boolean toggle on any stage; never a lifecycle move.
  // Authorization (requirePermission) runs only on the real transactional
  // path — the unit-test seam below passes no transactionID on purpose.
  if (operation === 'lock' || operation === 'unlock') {
    const lock = operation === 'lock'
    if (transactionID != null) await requirePermission({ payload, actor: { userId: args.userId, activeCharacterId: args.actorCharacterId }, domainId: args.domainId, capability: CAPABILITY[operation], resource: { type: 'Document', id: document.id }, transactionID })
    await payload.update({ collection: 'documents', id: document.id, data: { locked: lock }, depth: 0, ...(req ? { req } : {}) })
    await recordDocumentProvenance({
      payload,
      domainId: args.domainId,
      documentId: document.id,
      eventType: lock ? 'locked' : 'unlocked',
      actorUserId: args.userId,
      actorCharacterId: args.actorCharacterId,
      context: { from: document.lifecycle, to: document.lifecycle, reason: 'manual', ...(args.note ? { note: args.note } : {}) },
      revisionId: await latestDocumentRevisionId(payload, document.id, transactionID ?? undefined),
      ...(transactionID == null ? {} : { transactionID }),
    })
    return { ...document, locked: lock }
  }

  const transition = STAGE_TRANSITIONS[operation]
  // P08X-T06: stage-list grants decide transitions by the DESTINATION stage's
  // manageRoles (spec §3.4) — submit/file/approve/reject pass the stage the
  // record moves INTO so the stage lists can authorize it.
  if (transactionID != null) await requirePermission({ payload, actor: { userId: args.userId, activeCharacterId: args.actorCharacterId }, domainId: args.domainId, capability: CAPABILITY[operation], resource: { type: 'Document', id: document.id, stage: transition.to }, transactionID })
  if (document.lifecycle !== transition.from) throw new Error(`This record is ${document.lifecycle}; it cannot be ${operation}.`)
  assertLifecycleTransition(document.lifecycle, transition.to)
  const typeId = relationId((document as { documentType?: unknown }).documentType)
  const typeRecord = typeId == null ? null : await payload.findByID({ collection: 'document-types', id: typeId, depth: 0, ...(req ? { req } : {}) }).catch(() => null) as Record<string, unknown> | null
  const priorFolderId = relationId((document as { folder?: unknown }).folder)
  const routedFolderId = resolveLifecycleRouteFolder(typeRecord, transition.to, priorFolderId)
  const folderChanged = routedFolderId != null && priorFolderId != null && routedFolderId !== priorFolderId
  // P08X-T06: leaving Draft ends the private-draft state — a Submitted/Filed
  // record is no longer a private DRAFT, so it becomes visible to the
  // destination stage's readers. The flag is creator-only by construction.
  const privateDraft = (document as { privateDraft?: unknown }).privateDraft === true
  const data: Record<string, unknown> = { lifecycle: transition.to, ...(privateDraft && transition.from === 'draft' ? { privateDraft: false } : {}) }
  if (folderChanged) data.folder = routedFolderId
  await payload.update({ collection: 'documents', id: document.id, data, depth: 0, ...(req ? { req } : {}) })
  await recordDocumentProvenance({
    payload,
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
    revisionId: await latestDocumentRevisionId(payload, document.id, transactionID ?? undefined),
    ...(transactionID == null ? {} : { transactionID }),
  })
  return { ...document, lifecycle: transition.to, ...(folderChanged ? { folder: routedFolderId } : {}) }
}

export async function transitionDocument(args: WorkflowActor & { operation: WorkflowOperation; note?: string | null }) {
  // Unit-test seam: mocks without a database adapter (workflow.test.ts) run the
  // pure transition/provenance path. Production Payload always provides db, so
  // the transactional path below is the only one customer code can reach.
  if (typeof (args.payload as { db?: { beginTransaction?: unknown } }).db?.beginTransaction !== 'function') {
    return applyTransition(args)
  }
  const { runInTransaction } = await import('@/lib/documents/relationships')
  return runInTransaction(args.payload, (transactionID) => applyTransition(args, transactionID))
}
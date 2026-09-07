// Server-only (G12): this module imports the authorization session layer and
// must never be pulled into a client bundle. It computes the exact per-record
// capability flags the initial Records Page Model ships, so the live
// /api/records-search endpoint projects the SAME authorization semantics
// (P08D-T01-A): no client-side inference, no hard-coded flags.
import { decideInSession, resolveDocumentTarget, type AuthzSession } from '@/lib/authz/session'
import type { RecordSummary } from '@/lib/page-models/common'

export type RecordCapabilitySource = {
  id: number
  folderId: number | null
  documentTypeId: number | null
  lifecycle: string
  locked: boolean
  privateDraft: boolean
  creatorCharacterId: number | null
}

export type RecordCapabilityFlags = RecordSummary['capabilities']

/** Mirrors buildRecordsPageModel's per-record decision, shared with search. */
export function computeRecordCapabilities(session: AuthzSession, document: RecordCapabilitySource): RecordCapabilityFlags {
  const target = resolveDocumentTarget(session, {
    id: document.id,
    folderId: document.folderId,
    subdomainId: null,
    documentTypeId: document.documentTypeId,
    stage: document.lifecycle as never,
    privateDraft: document.privateDraft,
    creatorCharacterId: document.creatorCharacterId,
  })
  const read = decideInSession(session, 'read', target).allowed
  if (!read) {
    // A record this session cannot read must never be shipped or acted on.
    return { read: false, edit: false, supersede: false, delete: false }
  }
  const edit = decideInSession(session, 'edit_document', target).allowed
  // Supersession is a Type-gated create (P07X-T03): create_document on the
  // record's Document Type, not a customer-chosen destination Folder.
  const typeId = document.documentTypeId
  const supersede = typeId !== null && decideInSession(session, 'create_document', { type: 'DocumentType', id: typeId }).allowed
  const del = decideInSession(session, 'delete_document', target).allowed
  return { read, edit, supersede, delete: del }
}
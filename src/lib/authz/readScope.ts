import type { Payload } from 'payload'

import { decideInSession, folderAncestry, type AuthzSession } from './session'
import type { Capability, ResourceType } from '@/lib/permissions/capabilities'

/**
 * P07P-03: compile the effective document read scope into sets.
 *
 * For a Domain and actor session, derive (spec "Query-level filtering"):
 * - A: folders whose inherited effective Document read is allowed
 * - G: Documents whose final decision is allowed despite a denied folder baseline
 * - D: Documents whose final decision is denied despite an allowed folder baseline
 *
 * Direct grants/denies are resolved by the frozen tier/specificity rules
 * through the SAME pure decision engine — never a second SQL precedence
 * implementation. Empty permission sets compile to an empty scope (FALSE).
 *
 * All evaluation is pure (zero SQL): folder ancestry and document exception
 * metadata come from the session plus a bulk document-metadata fetch done by
 * the caller (compileReadScope below performs it in one bounded query).
 */

export type ReadScope = {
  /** Folders whose effective baseline read is allowed (folder itself + descendants by inheritance). */
  allowedFolderIds: Set<number>
  /** Documents explicitly allowed despite a denied folder baseline. */
  grantDocumentIds: Set<number>
  /** Documents explicitly denied despite an allowed folder baseline. */
  denyDocumentIds: Set<number>
  /** True when the actor's authority bypasses ACL rules entirely (owner/admin/platform). */
  authorityBypass: boolean
}

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/**
 * Evaluate every folder's inherited effective read decision purely, then
 * intersect document exceptions through the same decision engine.
 *
 * `documents` is the bulk document metadata (id, folder) for the Domain —
 * fetched once by the caller via compileReadScope. Inheritance follows the
 * frozen contract: a folder's effective read is its own decision (Document
 * rules do not propagate upward; Folder/Department/Domain rules inherit down
 * through the folder chain naturally by the specificity engine).
 */
export function computeReadScope(session: AuthzSession, documents: Array<{ id: number; folderId: number | null }>, capability: Capability = 'read'): ReadScope {
  if (session.authority) return { allowedFolderIds: new Set(session.folders.keys()), grantDocumentIds: new Set(), denyDocumentIds: new Set(), authorityBypass: true }

  const allowedFolderIds = new Set<number>()
  for (const folderId of session.folders.keys()) {
    const ancestry = folderAncestry(session, folderId)
    const decision = decideFolder(session, capability, { type: 'Folder', id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId })
    if (decision) allowedFolderIds.add(folderId)
  }

  const grantDocumentIds = new Set<number>()
  const denyDocumentIds = new Set<number>()
  for (const document of documents) {
    const exceptions = session.documentExceptions.get(document.id)
    if (!exceptions || exceptions.length === 0) continue
    // Only documents with exception rules can deviate from their folder's
    // baseline; evaluate the final decision through the same engine.
    const target = documentTarget(session, document)
    const finalAllowed = decideFolder(session, capability, target)
    const baseline = document.folderId == null ? false : allowedFolderIds.has(document.folderId)
    if (finalAllowed && !baseline) grantDocumentIds.add(document.id)
    if (!finalAllowed && baseline) denyDocumentIds.add(document.id)
  }
  return { allowedFolderIds, grantDocumentIds, denyDocumentIds, authorityBypass: false }
}

type AnyTarget = { type: ResourceType; id: number; folderChain?: number[]; subdomainId?: number | null }

function decideFolder(session: AuthzSession, capability: Capability, target: AnyTarget): boolean {
  const decision = decideInSession(session, capability, target as never)
  return decision.allowed
}

function documentTarget(session: AuthzSession, document: { id: number; folderId: number | null }): AnyTarget {
  const ancestry = document.folderId == null ? { chain: [], subdomainId: null } : folderAncestry(session, document.folderId)
  return { type: 'Document', id: document.id, folderChain: document.folderId == null ? [] : [document.folderId, ...ancestry.chain], subdomainId: ancestry.subdomainId }
}

/**
 * Compile the read scope. The folder baseline is entirely session-local; the
 * only document metadata needed for A/G/D exceptions is the small set of
 * documents that actually have a Document-scope rule. Never scan the whole
 * Domain corpus just to decide whether a caller can open one record.
 */
export async function compileReadScope(payload: Payload, session: AuthzSession, capability: Capability = 'read'): Promise<ReadScope> {
  if (session.authority) return { allowedFolderIds: new Set(session.folders.keys()), grantDocumentIds: new Set(), denyDocumentIds: new Set(), authorityBypass: true }
  const exceptionIds = [...session.documentExceptions.keys()]
  const rows: Array<{ id: number; folderId: number | null }> = []
  // Keep each statement comfortably below SQLite's variable limit. This is
  // correctness-preserving exhaustive iteration, not a silent result cap.
  for (let offset = 0; offset < exceptionIds.length; offset += 400) {
    const ids = exceptionIds.slice(offset, offset + 400)
    const documents = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: session.domainId } }, { id: { in: ids } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    rows.push(...documents.docs.map((document) => ({ id: Number(document.id), folderId: idOf((document as { folder?: unknown }).folder) })))
  }
  return computeReadScope(session, rows, capability)
}

export { idOf }

import type { Payload } from 'payload'

import { decideInSession, folderAncestry, folderNarrowingDeny, grantedTypeIds, type AuthzSession } from './session'
import type { Capability, ResourceType } from '@/lib/permissions/capabilities'

/**
 * P07X-T03: compile the effective record read scope into sets.
 *
 * The two-axis record decision replaces the old folder-baseline model:
 * - grant axis: Document Type rules (or a direct Document exception) grant the
 *   record capability — Folder grants never create a missing record capability;
 * - narrowing axis: Folder/Subdomain/Domain denies narrow a Type/Document grant.
 *
 * The compiled scope gives list queries everything they need server-side:
 * - A: readableTypeIds — Types with an effective grant for the capability;
 * - N: denyFolderIds — Folders whose ancestry carries an effective deny;
 * - G: documents allowed by a direct Document grant despite a denied baseline;
 * - D: documents denied by a direct Document deny despite an allowed baseline;
 * - V: visibleFolderIds — containers the actor may at least see (Folder-read
 *   grants and their ancestors; refined by the T04 projection).
 *
 * A document without exception rules is readable when its Type is in
 * readableTypeIds AND its Folder is not in denyFolderIds. All evaluation is
 * pure (zero SQL): rule/folder/type metadata comes from the session plus a
 * bulk document-metadata fetch done by the caller.
 */

export type ReadScope = {
  /** Document Types whose effective record-capability decision is a grant (grant axis). */
  readableTypeIds: Set<number>
  /** Folders whose ancestry carries an effective Folder/Subdomain/Domain deny (narrowing axis). */
  denyFolderIds: Set<number>
  /** Documents allowed by a direct Document grant despite a denied baseline. */
  grantDocumentIds: Set<number>
  /** Documents denied by a direct Document deny despite an allowed baseline. */
  denyDocumentIds: Set<number>
  /** Folders the actor may at least see (container visibility; T04 refines). */
  visibleFolderIds: Set<number>
  /** True when the actor's authority bypasses ACL rules entirely (owner/admin). */
  authorityBypass: boolean
}

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/**
 * Evaluate the two-axis scope purely. `documents` is the bulk metadata of
 * documents that carry a Document-scope rule (fetched once by the caller);
 * documents without exception rules are covered by the baseline predicate.
 */
export function computeReadScope(session: AuthzSession, documents: Array<{ id: number; folderId: number | null; documentTypeId?: number | null }>, capability: Capability = 'read'): ReadScope {
  if (session.authority) return { readableTypeIds: new Set(), denyFolderIds: new Set(), grantDocumentIds: new Set(), denyDocumentIds: new Set(), visibleFolderIds: new Set(session.folders.keys()), authorityBypass: true }

  const readableTypeIds = grantedTypeIds(session, capability)

  const denyFolderIds = new Set<number>()
  const visibleFolderIds = new Set<number>()
  for (const folderId of session.folders.keys()) {
    if (folderNarrowingDeny(session, capability, folderId)) denyFolderIds.add(folderId)
    const ancestry = folderAncestry(session, folderId)
    const folderTarget: AnyTarget = { type: 'Folder', id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }
    if (decideInSession(session, 'read', folderTarget).allowed) {
      visibleFolderIds.add(folderId)
      for (const ancestorId of ancestry.chain) visibleFolderIds.add(ancestorId)
    }
  }

  const grantDocumentIds = new Set<number>()
  const denyDocumentIds = new Set<number>()
  for (const document of documents) {
    const exceptions = session.documentExceptions.get(document.id)
    if (!exceptions || exceptions.length === 0) continue
    // Baseline: the two-axis predicate without the direct Document exception.
    const narrowed = document.folderId == null ? false : denyFolderIds.has(document.folderId)
    const typeGranted = document.documentTypeId != null && readableTypeIds.has(document.documentTypeId)
    const baseline = typeGranted && !narrowed
    // Final: the direct Document exception (most-specific same-record path)
    // resolved through the SAME two-axis engine.
    const finalAllowed = decideInSession(session, capability, documentTarget(session, document)).allowed
    if (finalAllowed && !baseline) grantDocumentIds.add(document.id)
    if (!finalAllowed && baseline) denyDocumentIds.add(document.id)
  }
  return { readableTypeIds, denyFolderIds, grantDocumentIds, denyDocumentIds, visibleFolderIds, authorityBypass: false }
}

type AnyTarget = { type: ResourceType; id: number; folderChain?: number[]; subdomainId?: number | null; documentTypeId?: number | null }

function documentTarget(session: AuthzSession, document: { id: number; folderId: number | null; documentTypeId?: number | null }): AnyTarget {
  const ancestry = document.folderId == null ? { chain: [], subdomainId: null } : folderAncestry(session, document.folderId)
  return { type: 'Document', id: document.id, folderChain: document.folderId == null ? [] : [document.folderId, ...ancestry.chain], subdomainId: ancestry.subdomainId, documentTypeId: document.documentTypeId == null ? null : Number(document.documentTypeId) }
}

/**
 * Compile the read scope. The only document metadata needed for G/D exceptions
 * is the small set of documents that actually have a Document-scope rule —
 * never scan the whole Domain corpus just to decide one record.
 */
export async function compileReadScope(payload: Payload, session: AuthzSession, capability: Capability = 'read'): Promise<ReadScope> {
  if (session.authority) return { readableTypeIds: new Set(), denyFolderIds: new Set(), grantDocumentIds: new Set(), denyDocumentIds: new Set(), visibleFolderIds: new Set(session.folders.keys()), authorityBypass: true }
  const exceptionIds = [...session.documentExceptions.keys()]
  const rows: Array<{ id: number; folderId: number | null; documentTypeId?: number | null }> = []
  // Keep each statement comfortably below SQLite's variable limit. This is
  // correctness-preserving exhaustive iteration, not a silent result cap.
  for (let offset = 0; offset < exceptionIds.length; offset += 400) {
    const ids = exceptionIds.slice(offset, offset + 400)
    const documents = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: session.domainId } }, { id: { in: ids } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    rows.push(...documents.docs.map((document) => ({ id: Number(document.id), folderId: idOf((document as { folder?: unknown }).folder), documentTypeId: idOf((document as { documentType?: unknown }).documentType) })))
  }
  return computeReadScope(session, rows, capability)
}

export { idOf }
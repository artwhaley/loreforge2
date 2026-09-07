import type { Payload } from 'payload'

import type { Where } from 'payload'

import { decideInSession, folderAncestry, folderNarrowingDeny, grantedTypeIds, stageReadablePairs, type AuthzSession } from './session'
import type { Capability, ResourceType } from '@/lib/permissions/capabilities'
import type { Lifecycle } from '@/lib/documents/lifecycle'

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
  /** P08X-T06: (type, stage) pairs readable through the stage readRoles lists. */
  stageListReadable: Array<{ typeId: number; stage: Lifecycle }>
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
export function computeReadScope(session: AuthzSession, documents: Array<{ id: number; folderId: number | null; documentTypeId?: number | null; stage?: string | null; privateDraft?: boolean | null; creatorCharacterId?: number | null }>, capability: Capability = 'read'): ReadScope {
  if (session.authority) return { readableTypeIds: new Set(), denyFolderIds: new Set(), grantDocumentIds: new Set(), denyDocumentIds: new Set(), visibleFolderIds: new Set(session.folders.keys()), stageListReadable: [], authorityBypass: true }

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
  return { readableTypeIds, denyFolderIds, grantDocumentIds, denyDocumentIds, visibleFolderIds, stageListReadable: stageReadablePairs(session), authorityBypass: false }
}

/**
 * P08X-T06: the private-draft visibility clause — public drafts plus drafts
 * the acting Character created. Admins (authority) skip it. Returns null when
 * nothing should be filtered (authority bypass).
 */
export function privateDraftClause(session: AuthzSession): Where | null {
  if (session.authority) return null
  const actorCharacterId = session.characterState?.characterId ?? null
  return actorCharacterId == null
    ? { privateDraft: { not_equals: true } }
    : { or: [{ privateDraft: { not_equals: true } }, { creatorCharacter: { equals: actorCharacterId } }] }
}

/**
 * P08X-T06: the complete SQL record-read predicate shared by every record
 * list/count query — the two-axis baseline (Type grant + Folder narrowing +
 * direct Document exceptions), the stage-list read grants (each narrowed by
 * the same Folder denies), and the private-draft creator-Character boundary.
 * Callers wrap these clauses with their own domain/soft-delete/folder/type/
 * text filters. Empty when authority bypasses ACLs.
 */
export function recordReadPredicate(scope: ReadScope, session: AuthzSession): Where[] {
  if (scope.authorityBypass) return []
  const clauses: Where[] = []
  clauses.push({ id: { not_in: scope.denyDocumentIds.size > 0 ? [...scope.denyDocumentIds] : [-1] } })
  const baseline: Where[] = [
    {
      and: [
        { documentType: { in: scope.readableTypeIds.size > 0 ? [...scope.readableTypeIds] : [-1] } },
        { folder: { not_in: scope.denyFolderIds.size > 0 ? [...scope.denyFolderIds] : [-1] } },
      ],
    },
  ]
  if (scope.grantDocumentIds.size > 0) baseline.push({ id: { in: [...scope.grantDocumentIds] } })
  for (const { typeId, stage } of scope.stageListReadable) {
    baseline.push({
      and: [
        { documentType: { equals: typeId } },
        { lifecycle: { equals: stage } },
        { folder: { not_in: scope.denyFolderIds.size > 0 ? [...scope.denyFolderIds] : [-1] } },
      ],
    })
  }
  clauses.push({ or: baseline })
  const privateDraft = privateDraftClause(session)
  if (privateDraft) clauses.push(privateDraft)
  return clauses
}

type AnyTarget = { type: ResourceType; id: number; folderChain?: number[]; subdomainId?: number | null; documentTypeId?: number | null; stage?: Lifecycle | null; privateDraft?: boolean | null; creatorCharacterId?: number | null }

function documentTarget(session: AuthzSession, document: { id: number; folderId: number | null; documentTypeId?: number | null; stage?: string | null; privateDraft?: boolean | null; creatorCharacterId?: number | null }): AnyTarget {
  const ancestry = document.folderId == null ? { chain: [], subdomainId: null } : folderAncestry(session, document.folderId)
  return {
    type: 'Document',
    id: document.id,
    folderChain: document.folderId == null ? [] : [document.folderId, ...ancestry.chain],
    subdomainId: ancestry.subdomainId,
    documentTypeId: document.documentTypeId == null ? null : Number(document.documentTypeId),
    stage: (document.stage ?? null) as Lifecycle | null,
    privateDraft: document.privateDraft === true,
    creatorCharacterId: document.creatorCharacterId ?? null,
  }
}

/**
 * Compile the read scope. The only document metadata needed for G/D exceptions
 * is the small set of documents that actually have a Document-scope rule —
 * never scan the whole Domain corpus just to decide one record.
 */
export async function compileReadScope(payload: Payload, session: AuthzSession, capability: Capability = 'read'): Promise<ReadScope> {
  if (session.authority) return { readableTypeIds: new Set(), denyFolderIds: new Set(), grantDocumentIds: new Set(), denyDocumentIds: new Set(), visibleFolderIds: new Set(session.folders.keys()), stageListReadable: [], authorityBypass: true }
  const exceptionIds = [...session.documentExceptions.keys()]
  const rows: Array<{ id: number; folderId: number | null; documentTypeId?: number | null }> = []
  // Keep each statement comfortably below SQLite's variable limit. This is
  // correctness-preserving exhaustive iteration, not a silent result cap.
  for (let offset = 0; offset < exceptionIds.length; offset += 400) {
    const ids = exceptionIds.slice(offset, offset + 400)
    const documents = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: session.domainId } }, { id: { in: ids } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    rows.push(...documents.docs.map((document) => ({
      id: Number(document.id),
      folderId: idOf((document as { folder?: unknown }).folder),
      documentTypeId: idOf((document as { documentType?: unknown }).documentType),
      stage: (document as { lifecycle?: unknown }).lifecycle == null ? null : String((document as { lifecycle?: unknown }).lifecycle),
      privateDraft: (document as { privateDraft?: unknown }).privateDraft === true,
      creatorCharacterId: idOf((document as { creatorCharacter?: unknown }).creatorCharacter),
    })))
  }
  return computeReadScope(session, rows, capability)
}

export { idOf }
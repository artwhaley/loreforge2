import type { Payload, User } from 'payload'

import { canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'
import { loadAuthorizationSession } from '@/lib/authz/session'
import { compileReadScope } from '@/lib/authz/readScope'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

export type InterimDocumentContext = {
  domainId?: number | null
  tenantId?: number | null
  lifecycle?: Lifecycle
  softDeletedAt?: string | null
}

/**
 * The interim per-Document decision, shared by `Documents.access.read`,
 * `.update`, and `.readVersions` so the three cannot drift.
 *
 * P07P-04: the controlled-Character union fallback is REMOVED (owner decision
 * 2026-09-04). The decision evaluates exactly the acting identity — the
 * validated active Character when one is in scope, otherwise actual
 * User-level authority (platform/owner/admin plus direct User rules).
 * Another controlled Character's access never substitutes for the acting one.
 *
 * Every caller inside this function queries with overrideAccess: true on
 * purpose: this decision IS the authorization boundary, and the Local API
 * otherwise bypasses collection access control (Payload 3.88 defaults Local
 * API operations to overrideAccess). Direct REST/GraphQL/Admin requests reach
 * here through the collection access functions.
 */
export async function canAccessDocument(args: {
  payload: Payload
  user: Pick<User, 'id'>
  /** The validated acting Character, or null for actual User-level authority. */
  activeCharacterId?: number | string | null
  documentId: number | string
  capability: 'read' | 'update'
}): Promise<boolean> {
  const { payload, user, activeCharacterId, documentId, capability } = args
  const currentResult = await payload.find({ collection: 'documents', where: { id: { equals: documentId } }, depth: 0, limit: 1, overrideAccess: true })
  const current = currentResult.docs[0] as unknown as ({ domain?: unknown; tenant?: unknown; lifecycle?: unknown; softDeletedAt?: unknown } & Record<string, unknown>) | undefined
  if (!current) return false
  if (current.softDeletedAt) return false
  const domainId = relationId(current.domain)
  if (!domainId) return false
  const session = await loadAuthorizationSession(payload, { userId: user.id, activeCharacterId: activeCharacterId ?? null }, domainId)
  // Read and update are separate capabilities. Reusing a read scope for an
  // update check would turn read-only folder access into write authority.
  const scope = await compileReadScope(payload, session, capability === 'update' ? 'edit_document' : 'read')
  const documentIdNum = Number(documentId)
  const folderId = relationId(current.folder)
  const allowed = scope.authorityBypass
    || (folderId != null && scope.allowedFolderIds.has(folderId) && !scope.denyDocumentIds.has(documentIdNum))
    || scope.grantDocumentIds.has(documentIdNum)
  return allowed && (capability !== 'update' || lifecycleEditable(current.lifecycle))
}

/**
 * Version IDs are a separate namespace from Document IDs. Payload calls the
 * collection readVersions access function with the version ID for a detail
 * request, while a version list has no id at all. Resolve the parent first and
 * then reuse the exact current-document decision; never pass a version ID to
 * canAccessDocument as if it were a Document ID.
 */
export async function canAccessDocumentVersion(args: {
  payload: Payload
  user: Pick<User, 'id'>
  activeCharacterId?: number | string | null
  versionId: number | string
}): Promise<boolean> {
  const versions = await args.payload.findVersions({
    collection: 'documents',
    where: { id: { equals: args.versionId } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
  })
  const parent = versions.docs[0]?.parent
  const parentId = relationId(parent)
  if (!parentId) return false
  return canAccessDocument({ payload: args.payload, user: args.user, activeCharacterId: args.activeCharacterId ?? null, documentId: parentId, capability: 'read' })
}

/**
 * Query constraint used by Payload's version-list operation. The list access
 * callback has no version id, so constrain versions by the parent Documents
 * the user may read through the compiled A/G/D scope.
 *
 * P07P-03: this previously scanned up to 10,000 documents and evaluated each
 * through the full per-document pipeline (with a controlled-Character fan-out
 * of up to 200 per document). It now compiles the scope once (one bulk
 * metadata fetch + pure evaluation) and returns a membership constraint.
 */
export async function readableVersionParentQuery(args: {
  payload: Payload
  user: Pick<User, 'id'>
  activeCharacterId?: number | string | null
}): Promise<{ parent: { in: Array<number | string> } | { equals: never } }> {
  const { payload, user } = args
  // Resolve the actor's readable Domains: member Character Domains plus
  // administered/owned (plus platform = all). The authority-bypass path uses
  // ONE unbounded query across all readable Domains (100+ Domain platform
  // owner shapes stay correct without per-Domain iteration); scoped actors
  // compile the A/G/D predicate per Domain.
  const [userRow, memberships, owned, adminRows, platformDomains] = await Promise.all([
    payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }).catch(() => null),
    args.activeCharacterId == null ? { docs: [] } : payload.find({ collection: 'domain-memberships', where: { and: [{ character: { equals: args.activeCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true }),
    payload.find({ collection: 'domains', where: { ownerUser: { equals: user.id } }, depth: 0, limit: 0, pagination: false, overrideAccess: true }),
    payload.find({ collection: 'domain-admins', where: { and: [{ user: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true }),
    payload.find({ collection: 'domains', depth: 0, limit: 0, pagination: false, overrideAccess: true }),
  ])
  const isPlatform = Boolean((userRow as { isPlatformAdmin?: unknown } | null)?.isPlatformAdmin)
  const relationIdOf = relationId
  const memberDomainIds = memberships.docs.map((membership) => relationIdOf((membership as { domain?: unknown }).domain) ?? relationIdOf((membership as { tenant?: unknown }).tenant)).filter((id): id is number => id !== null)
  const adminDomainIds = adminRows.docs.map((row) => relationIdOf((row as { domain?: unknown }).domain)).filter((id): id is number => id !== null)
  const ownedDomainIds = owned.docs.map((domain) => Number(domain.id))
  const authorityDomainIds = [...new Set([...memberDomainIds, ...adminDomainIds, ...ownedDomainIds])]
  const bypassAll = isPlatform || authorityDomainIds.length === platformDomains.docs.length
  const visible: number[] = []
  if (bypassAll) {
    const docs = await payload.find({ collection: 'documents', where: { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    visible.push(...docs.docs.map((document) => Number(document.id)))
    return { parent: { in: visible } }
  }
  for (const domainId of authorityDomainIds) {
    const session = await loadAuthorizationSession(payload, { userId: user.id, activeCharacterId: args.activeCharacterId ?? null }, domainId)
    const scope = await compileReadScope(payload, session)
    if (scope.authorityBypass) {
      const docs = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
      visible.push(...docs.docs.map((document) => Number(document.id)))
      continue
    }
    const docs = await payload.find({
      collection: 'documents',
      where: {
        and: [
          { domain: { equals: domainId } },
          { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] },
          { or: [
            { and: [{ folder: { in: [...scope.allowedFolderIds] } }, { id: { not_in: [...scope.denyDocumentIds] } }] },
            { id: { in: [...scope.grantDocumentIds] } },
          ] },
        ],
      },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    })
    visible.push(...docs.docs.map((document) => Number(document.id)))
  }
  return { parent: { in: visible } }
}

function lifecycleEditable(lifecycle: unknown): boolean {
  return canEditDocumentBody(String(lifecycle ?? 'draft') as Lifecycle)
}

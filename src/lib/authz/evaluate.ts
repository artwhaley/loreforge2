import type { Payload } from 'payload'

import { isCapability, type Capability } from '@/lib/permissions/capabilities'
import { decideInSession, folderAncestry, loadAuthorizationSession, resolveDocumentTarget, type AuthzActor, type AuthzResourceRef, type SessionDecision } from './session'
import { loadCachedAuthorizationSession } from './sessionCache'

/**
 * P07P-02 compatible wrapper.
 *
 * Same signature and frozen semantics as the previous per-call evaluator, but
 * each call loads one request-owned session of facts and decides purely
 * against it. Callers are migrated to explicit session passing during this
 * same patch; this wrapper exists so intermediate states stay authorized.
 *
 * NOTE (owner decision 2026-09-04): the acting Character is a first-order
 * identity. This wrapper evaluates exactly the passed actor — never a union
 * of the User's other controlled Characters. With no validated acting
 * Character the decision is User-level authority only.
 */

export type PermissionActor = AuthzActor
export type PermissionDecision = SessionDecision

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export async function evaluatePermission(args: { payload: Payload; actor: PermissionActor; domainId: number | string; capability: string; resource: AuthzResourceRef; transactionID?: number | string | null }): Promise<PermissionDecision> {
  const domainId = Number(args.domainId)
  if (!Number.isInteger(domainId) || !isCapability(args.capability)) return { allowed: false, reason: 'Invalid Domain or capability.', trace: [] }
  // P07P-02: request-local memoized session — repeated wrapper calls in one
  // request (pages, shells, hooks) share facts instead of reloading them.
  // Transaction callers pass transactionID and bypass the cache explicitly.
  const session = args.transactionID != null
    ? await loadAuthorizationSession(args.payload, args.actor, domainId, { transactionID: args.transactionID })
    : await loadCachedAuthorizationSession(args.payload, Number(args.actor.userId), args.actor.activeCharacterId ?? null, domainId)
  const capability = args.capability as Capability
  const { type, id } = args.resource
  if (type === 'Document') {
    // A Document decision needs its folder ancestry (Folder/Department/Domain
    // rules apply through it). Fetch the lightweight row once; the chain
    // itself resolves in-memory from session facts.
    // Transaction rule: a check inside a caller's open transaction MUST pass
    // req with the transactionID — without it the Local API auto-commits a
    // separate read that cannot see rows created earlier in that transaction
    // (see db/transactions.ts); the just-created Document would look missing.
    const document = await args.payload.findByID({ collection: 'documents', id, depth: 0, overrideAccess: true, ...(args.transactionID == null ? {} : { req: { transactionID: args.transactionID } }) }).catch(() => null) as unknown as Record<string, unknown> | null
    if (!document) return { allowed: false, reason: 'Resource not found.', trace: ['Resource lookup failed.'] }
    if (idOf(document.domain) !== session.domainId) return { allowed: false, reason: 'Resource belongs to another Domain.', trace: ['Cross-Domain resource rejected.'] }
    if (document.softDeletedAt) return { allowed: false, reason: 'Document is soft-deleted.', trace: ['Soft-deleted resource rejected.'] }
    const target = resolveDocumentTarget(session, { id: Number(id), folderId: idOf(document.folder), subdomainId: idOf(document.subdomain) })
    return decideInSession(session, capability, target)
  }
  if (type === 'Folder') {
    const folder = session.folders.get(Number(id)) ?? await (async () => {
      const row = await args.payload.findByID({ collection: 'folders', id, depth: 0, overrideAccess: true, ...(args.transactionID == null ? {} : { req: { transactionID: args.transactionID } }) }).catch(() => null) as unknown as Record<string, unknown> | null
      if (!row) return null
      if (idOf(row.domain) !== session.domainId) return 'cross-domain' as const
      return { id: Number(id), parentId: idOf(row.parent), subdomainId: idOf(row.subdomain) }
    })()
    if (folder === null) return { allowed: false, reason: 'Resource not found.', trace: ['Resource lookup failed.'] }
    if (folder === 'cross-domain') return { allowed: false, reason: 'Resource belongs to another Domain.', trace: ['Cross-Domain resource rejected.'] }
    if (!session.folders.has(Number(id))) session.folders.set(Number(id), folder)
    const ancestry = folderAncestry(session, Number(id))
    return decideInSession(session, capability, { type: 'Folder', id: Number(id), folderChain: ancestry.chain, subdomainId: ancestry.subdomainId })
  }
  if (type === 'Subdomain') {
    if (!session.subdomains.has(Number(id))) {
      const row = await args.payload.findByID({ collection: 'subdomains', id, depth: 0, overrideAccess: true, ...(args.transactionID == null ? {} : { req: { transactionID: args.transactionID } }) }).catch(() => null) as unknown as Record<string, unknown> | null
      if (!row) return { allowed: false, reason: 'Resource not found.', trace: ['Resource lookup failed.'] }
      if (idOf(row.domain) !== session.domainId) return { allowed: false, reason: 'Resource belongs to another Domain.', trace: ['Cross-Domain resource rejected.'] }
    }
    return decideInSession(session, capability, { type: 'Subdomain', id: Number(id) })
  }
  return decideInSession(session, capability, { type: 'Domain', id: session.domainId })
}

export async function explainPermission(args: Parameters<typeof evaluatePermission>[0]) { return evaluatePermission(args) }

export async function requirePermission(args: Parameters<typeof evaluatePermission>[0]): Promise<PermissionDecision> {
  const decision = await evaluatePermission(args)
  if (!decision.allowed) throw new Error(decision.reason)
  return decision
}

export async function isAllowed(args: Parameters<typeof evaluatePermission>[0]): Promise<boolean> { return (await evaluatePermission(args)).allowed }

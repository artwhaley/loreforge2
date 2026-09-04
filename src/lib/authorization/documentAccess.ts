import type { Payload, User } from 'payload'

import { canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'
import { evaluatePermission } from '@/lib/authz/evaluate'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

export type InterimDocumentContext = {
  domainId?: number | null
  tenantId?: number | null
  lifecycle?: Lifecycle
  softDeletedAt?: string | null
}

/**
 * The interim pre-P07 per-Document decision, shared by `Documents.access.read`,
 * `.update`, and `.readVersions` so the three cannot drift.
 *
 * Read: owner / operational DomainAdmin / active controlled-Character member /
 * of the Document's Domain. Share remains deferred by the owner decision.
 *
 * Update: same read decision plus lifecycle editability of the *persisted*
 * document — Locked and Pending-Review records are not editable through a raw
 * update; sanctioned services (saveDocumentAction, workflow actions) enforce
 * the same rules server-side on their own path.
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
  documentId: number | string
  capability: 'read' | 'update'
}): Promise<boolean> {
  const { payload, user, documentId, capability } = args
  const currentResult = await payload.find({ collection: 'documents', where: { id: { equals: documentId } }, depth: 0, limit: 1, overrideAccess: true })
  const current = currentResult.docs[0] as unknown as ({ domain?: unknown; tenant?: unknown; lifecycle?: unknown; softDeletedAt?: unknown } & Record<string, unknown>) | undefined
  if (!current) return false
  if (current.softDeletedAt) return false
  const domainId = relationId(current.domain)
  if (!domainId) return false
  const decision = await evaluatePermission({
    payload,
    actor: { userId: user.id },
    domainId,
    capability: capability === 'read' ? 'read' : 'edit_document',
    resource: { type: 'Domain', id: domainId },
  })
  if (decision.allowed) return capability !== 'update' || lifecycleEditable(current.lifecycle)
  const controlled = await payload.find({ collection: 'characters', where: { and: [{ controlledBy: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 200, overrideAccess: true })
  for (const character of controlled.docs) {
    const acting = await evaluatePermission({ payload, actor: { userId: user.id, activeCharacterId: character.id }, domainId, capability: capability === 'read' ? 'read' : 'edit_document', resource: { type: 'Document', id: documentId } })
    if (acting.allowed) return capability !== 'update' || lifecycleEditable(current.lifecycle)
  }
  return false
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
  return canAccessDocument({ payload: args.payload, user: args.user, documentId: parentId, capability: 'read' })
}

/**
 * Query constraint used by Payload's version-list operation. The list access
 * callback has no version id, so constrain versions by the parent Documents
 * the user may read through the shared evaluator.
 */
export async function readableVersionParentQuery(args: {
  payload: Payload
  user: Pick<User, 'id'>
}): Promise<{ parent: { in: Array<number | string> } }> {
  const { payload, user } = args
  const docs = await payload.find({ collection: 'documents', where: { softDeletedAt: { exists: false } }, depth: 0, limit: 10000, overrideAccess: true })
  const visible: number[] = []
  for (const document of docs.docs) if (await canAccessDocument({ payload, user, documentId: document.id, capability: 'read' })) visible.push(Number(document.id))
  return { parent: { in: visible } }
}

function lifecycleEditable(lifecycle: unknown): boolean {
  return canEditDocumentBody(String(lifecycle ?? 'draft') as Lifecycle)
}

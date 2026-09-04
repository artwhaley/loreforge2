import type { Payload, User } from 'payload'

import { canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'
import { authorizeSharedDocumentAccess } from '@/lib/documents/sharing'

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
 * (document-scoped Share grant) of the Document's Domain; legacy Tenant branch
 * preserved for migration-era records.
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
  const tenantId = relationId(current.tenant)

  if (domainId) {
    const domain = await payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true }).catch(() => null) as unknown as ({ ownerUser?: unknown } & Record<string, unknown>) | null
    const ownerId = relationId(domain?.ownerUser)
    if (ownerId && Number(ownerId) === Number(user.id)) return capability !== 'update' || lifecycleEditable(current.lifecycle)
    const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domainId } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (admins.docs.length > 0) return capability !== 'update' || lifecycleEditable(current.lifecycle)
    if (capability === 'read') {
      if (await authorizeSharedDocumentAccess({ payload, documentId, userId: user.id, capability: 'read' })) return true
    }
    const controlled = await payload.find({ collection: 'characters', where: { and: [{ controlledBy: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 200, overrideAccess: true })
    if (controlled.docs.length === 0) return false
    const memberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { in: controlled.docs.map((character) => character.id) } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (memberships.docs.length === 0) return false
    // Interim seam: any active member may create and edit editable Documents.
    return capability !== 'update' || lifecycleEditable(current.lifecycle)
  }
  if (!tenantId) return false
  const memberships = await payload.find({ collection: 'memberships', where: { and: [{ tenant: { equals: tenantId } }, { user: { equals: user.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (memberships.docs.length === 0) return false
  return capability !== 'update' || lifecycleEditable(current.lifecycle)
}

function lifecycleEditable(lifecycle: unknown): boolean {
  return canEditDocumentBody(String(lifecycle ?? 'draft') as Lifecycle)
}

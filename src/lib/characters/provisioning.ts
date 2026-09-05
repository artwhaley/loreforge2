import type { Payload } from 'payload'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export type ProvisionResult = { characterId: number | null; reason: 'created' | 'existing' | 'reactivated' | 'skipped' | 'no-owner' }

type TransactionOptions = { transactionID?: number | string | null }
const txReq = (options?: TransactionOptions) => options?.transactionID == null ? undefined : { transactionID: options.transactionID }

/**
 * P07X-T01 — system-managed administrative identities.
 *
 * These helpers are the ONLY sanctioned way to create/retire admin-kind
 * Characters. They run through the Local API with overrideAccess because the
 * ordinary Character create/update surface is access-closed; the collection
 * hook still enforces every invariant (controller equality, exactly-one-active,
 * no memberships/roles).
 */

/** Ensure the platform_admin Character exists for a platform-admin-eligible User. */
export async function ensurePlatformAdminIdentity(payload: Payload, userId: number | string, options?: TransactionOptions): Promise<ProvisionResult> {
  const userIdNumber = Number(userId)
  const req = txReq(options)
  const user = await payload.findByID({ collection: 'users', id: userIdNumber, depth: 0, overrideAccess: true, req }).catch(() => null) as { isPlatformAdmin?: unknown } | null
  if (!user?.isPlatformAdmin) return { characterId: null, reason: 'skipped' }
  const existing = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'platform_admin' } }, { controlledBy: { equals: userIdNumber } }] }, depth: 0, limit: 1, overrideAccess: true, req })
  const row = existing.docs[0] as { id: number | string; status?: string } | undefined
  if (row) {
    if (row.status !== 'active') {
      await payload.update({ collection: 'characters', id: row.id, overrideAccess: true, req, data: { status: 'active', controlledBy: userIdNumber } })
      return { characterId: Number(row.id), reason: 'reactivated' }
    }
    return { characterId: Number(row.id), reason: 'existing' }
  }
  const created = await payload.create({ collection: 'characters', overrideAccess: true, req, data: { name: 'Administrator', kind: 'platform_admin', controlledBy: userIdNumber, status: 'active' } })
  return { characterId: Number(created.id), reason: 'created' }
}

/** Retire the platform_admin Character (status -> inactive) when eligibility is revoked. */
export async function revokePlatformAdminIdentity(payload: Payload, userId: number | string, options?: TransactionOptions): Promise<boolean> {
  const req = txReq(options)
  const existing = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'platform_admin' } }, { controlledBy: { equals: Number(userId) } }] }, depth: 0, limit: 1, overrideAccess: true, req })
  const row = existing.docs[0] as { id: number | string; status?: string } | undefined
  if (row && row.status === 'active') {
    await payload.update({ collection: 'characters', id: row.id, overrideAccess: true, req, data: { status: 'inactive' } })
  }
  return true
}

/** Ensure the domain_admin Character exists for a Community Domain's ownerUser. */
export async function ensureDomainAdminIdentity(payload: Payload, domainId: number | string, options?: TransactionOptions): Promise<ProvisionResult> {
  const domainIdNumber = Number(domainId)
  const req = txReq(options)
  const domain = await payload.findByID({ collection: 'domains', id: domainIdNumber, depth: 0, overrideAccess: true, req }).catch(() => null) as { name?: string; kind?: string; ownerUser?: unknown } | null
  if (!domain) throw new Error('The Domain does not exist.')
  if (String(domain.kind ?? 'community') !== 'community') return { characterId: null, reason: 'skipped' }
  const ownerId = relationId(domain.ownerUser)
  // Setup-pending Community Domains may legitimately have ownerUser = null
  // (P07X-T09 bootstrap); provision only once an owner is assigned.
  if (ownerId == null) return { characterId: null, reason: 'no-owner' }
  const existing = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: domainIdNumber } }] }, depth: 0, limit: 1, overrideAccess: true, req })
  const row = existing.docs[0] as { id: number | string; status?: string; controlledBy?: unknown } | undefined
  if (row) {
    if (row.status !== 'active' || relationId(row.controlledBy) !== ownerId) {
      await payload.update({ collection: 'characters', id: row.id, overrideAccess: true, req, data: { status: 'active', controlledBy: ownerId, administrativeDomain: domainIdNumber } })
      return { characterId: Number(row.id), reason: 'reactivated' }
    }
    return { characterId: Number(row.id), reason: 'existing' }
  }
  const created = await payload.create({ collection: 'characters', overrideAccess: true, req, data: { name: `Administrator of ${domain.name ?? 'Domain'}`, kind: 'domain_admin', controlledBy: ownerId, administrativeDomain: domainIdNumber, status: 'active' } })
  return { characterId: Number(created.id), reason: 'created' }
}

/** Retire the domain_admin Character (status -> inactive). */
export async function revokeDomainAdminIdentity(payload: Payload, domainId: number | string, options?: TransactionOptions): Promise<boolean> {
  const req = txReq(options)
  const existing = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: Number(domainId) } }] }, depth: 0, limit: 1, overrideAccess: true, req })
  const row = existing.docs[0] as { id: number | string; status?: string } | undefined
  if (row && row.status === 'active') {
    await payload.update({ collection: 'characters', id: row.id, overrideAccess: true, req, data: { status: 'inactive' } })
  }
  return true
}

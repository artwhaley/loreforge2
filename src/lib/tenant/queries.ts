import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Document, Tenant } from '@/payload-types'

import { tenantAndIdWhere, tenantWhere } from './scope'

/**
 * Tenant-scoped data access.
 *
 * Every tenant-owned query in the application goes through helpers like this
 * so the tenant condition cannot be forgotten at the call site (spec §8).
 */
export async function getDocumentsForTenant(tenant: Tenant): Promise<Document[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'documents',
    where: tenantWhere(tenant.id),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

export async function getDocumentForTenant(
  tenant: Tenant,
  documentId: number | string,
): Promise<Document | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'documents',
    where: tenantAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getTenantsForUser(userId: number | string): Promise<Tenant[]> {
  const payload = await getPayload({ config })
  const memberships = await payload.find({
    collection: 'memberships',
    where: { user: { equals: userId } },
    depth: 1,
    limit: 50,
  })
  return memberships.docs
    .map((m) => m.tenant as Tenant)
    .filter((t): t is Tenant => Boolean(t && typeof t === 'object'))
}

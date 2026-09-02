import type { Where } from 'payload'

/**
 * Builds a Payload `where` filter that scopes a query to one tenant.
 *
 * Pure and unit-tested (spec §14) so no call site can forget the tenant
 * condition — the accidental cross-Domain leak we guard against in the app path
 * is a server-side data concern, never UI filtering.
 */
export function tenantWhere(tenantId: number | string, extra?: Where): Where {
  const and: Where[] = [{ tenant: { equals: tenantId } }]
  if (extra) {
    and.push(extra)
  }
  return { and }
}

/** Combine a tenant-scoped where with an id condition. */
export function tenantAndIdWhere(tenantId: number | string, id: number | string): Where {
  return tenantWhere(tenantId, { id: { equals: id } })
}

/** Canonical Domain-scoped predicates used after the Phase 3 migration. */
export function domainWhere(domainId: number | string, extra?: Where): Where {
  const and: Where[] = [{ domain: { equals: domainId } }]
  if (extra) and.push(extra)
  return { and }
}

export function domainAndIdWhere(domainId: number | string, id: number | string): Where {
  return domainWhere(domainId, { id: { equals: id } })
}

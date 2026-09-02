import { createHash } from 'node:crypto'

export type LegacyDomainRow = { id: number | string; slug: string; name: string; [key: string]: unknown }
export type DomainMigrationPlan = {
  mappings: Array<{ legacyTenantId: number | string; domainId: number | string; slug: string }>
  reconciliation: { legacyCount: number; domainCount: number; legacyBodyHashes: string[]; domainBodyHashes: string[] }
}

/** Pure reconciliation helper used by the P03 migration and tests. */
export function buildDomainMigrationPlan(legacy: LegacyDomainRow[], domains: LegacyDomainRow[], bodyHashes: string[] = []): DomainMigrationPlan {
  const bySlug = new Map(domains.map((domain) => [domain.slug, domain]))
  const mappings = legacy.map((tenant) => {
    const domain = bySlug.get(tenant.slug)
    if (!domain) throw new Error(`No Domain mapping exists for legacy Tenant ${tenant.slug}.`)
    return { legacyTenantId: tenant.id, domainId: domain.id, slug: tenant.slug }
  })
  const hashes = [...bodyHashes].sort()
  return { mappings, reconciliation: { legacyCount: legacy.length, domainCount: domains.length, legacyBodyHashes: hashes, domainBodyHashes: hashes } }
}

export function hashBodies(bodies: string[]): string[] {
  return bodies.map((body) => createHash('sha256').update(body).digest('hex')).sort()
}

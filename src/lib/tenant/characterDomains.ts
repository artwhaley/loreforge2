import { getLorePayload } from '@/lib/payload'

import type { Domain, Tenant } from '@/payload-types'

type DomainRecord = Domain | Tenant

/**
 * Domains one Character actively participates in.
 *
 * The dashboard Domain picker shows only the Domains reachable by the chosen
 * Character, so navigation is character-first: pick who you are acting as,
 * then enter one of the Domains that Character belongs to. Mirrors the shape
 * of `getTenantsForUser` but scoped to a single Character.
 */
export async function getDomainsForCharacter(characterId: number | string): Promise<DomainRecord[]> {
  const payload = await getLorePayload()
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: { and: [{ character: { equals: characterId } }, { status: { equals: 'active' } }] },
    depth: 1,
    limit: 0,
    pagination: false,
  })
  const byId = new Map<string, DomainRecord>()
  for (const membership of memberships.docs) {
    const tenant = membership.domain ?? membership.tenant
    if (tenant && typeof tenant === 'object') byId.set(String(tenant.id), tenant as DomainRecord)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

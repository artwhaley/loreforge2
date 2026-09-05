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
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 1, overrideAccess: true }).catch(() => null) as { kind?: string; administrativeDomain?: DomainRecord | number | null } | null
  if (!character) return []
  const byId = new Map<string, DomainRecord>()
  // P07X-T02: administrative identities reach Domains through their scope, not
  // membership. platform_admin sees every Domain (as the platform surface);
  // domain_admin sees exactly its administrativeDomain.
  if (character.kind === 'platform_admin') {
    const all = await payload.find({ collection: 'domains', depth: 0, limit: 0, pagination: false, sort: 'name' })
    for (const domain of all.docs) byId.set(String(domain.id), domain as DomainRecord)
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  }
  if (character.kind === 'domain_admin') {
    const adminDomain = character.administrativeDomain
    if (adminDomain && typeof adminDomain === 'object') {
      return [adminDomain as DomainRecord]
    }
    if (adminDomain) {
      const domain = await payload.findByID({ collection: 'domains', id: Number(adminDomain), depth: 0, overrideAccess: true }).catch(() => null)
      if (domain) return [domain as DomainRecord]
    }
    return []
  }
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: { and: [{ character: { equals: characterId } }, { status: { equals: 'active' } }] },
    depth: 1,
    limit: 0,
    pagination: false,
  })
  for (const membership of memberships.docs) {
    const tenant = membership.domain ?? membership.tenant
    if (tenant && typeof tenant === 'object') byId.set(String(tenant.id), tenant as DomainRecord)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

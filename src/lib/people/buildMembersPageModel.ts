import type { Domain, Tenant } from '@/payload-types'

import type { MembersPageModel } from '@/lib/page-models/members'
import { getDepartmentParticipants, getDomainMemberRows, getSubdomainsForDomain } from '@/lib/domains/queries'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'
import { searchActiveCharacters } from '@/lib/people/characterSearch'
import { getLorePayload } from '@/lib/payload'

/**
 * Public member directory Page Model builder (OBSIDIAN-T08). Ports the
 * current `/members` route's authorized projection: Domain member rows,
 * derived Department participation, Role names, and admin-only server-filtered
 * search. Search availability follows the route's current rule (`role ===
 * 'admin'`); the model carries `canSearch` so a Design never branches on role
 * labels itself.
 */
export async function buildMembersPageModel(input: {
  tenant: Domain | Tenant
  role: 'admin' | 'member' | null
  user: { id: number | string } | null
  search?: string
}): Promise<MembersPageModel> {
  const { tenant, role, user, search } = input
  const baseUrl = `/domain/${tenant.slug}`
  const q = String(search ?? '').trim()
  const domain = tenant as Parameters<typeof getDomainMemberRows>[0]
  const [rows, subdomains] = await Promise.all([getDomainMemberRows(domain), getSubdomainsForDomain(domain.id)])
  const subdomainMemberships = (await Promise.all(subdomains.map(async (subdomain) => ({ subdomain, memberships: await getDepartmentParticipants(subdomain.id) })))).flatMap(({ subdomain, memberships }) => memberships.map((membership) => ({ characterId: typeof membership.character === 'object' ? membership.character?.id : membership.character, name: subdomain.name })))
  const subdomainsByCharacter = new Map<number, string[]>()
  for (const item of subdomainMemberships) if (item.characterId) subdomainsByCharacter.set(Number(item.characterId), [...(subdomainsByCharacter.get(Number(item.characterId)) ?? []), item.name])
  const payload = await getLorePayload()
  const roleAssignments = await payload.find({ collection: 'role-assignments', where: { status: { equals: 'active' } }, depth: 2, limit: 500 })
  const roleNamesByCharacter = new Map<number, string[]>()
  for (const assignment of roleAssignments.docs) {
    const roleRecord = typeof assignment.role === 'object' ? assignment.role : null
    const roleDomainId = roleRecord && typeof roleRecord.domain === 'object' ? roleRecord.domain.id : roleRecord?.domain
    if (String(roleDomainId) !== String(domain.id)) continue
    const characterId = typeof assignment.character === 'object' ? assignment.character?.id : assignment.character
    const roleName = roleRecord?.name ?? `Role ${assignment.role}`
    if (characterId && roleName) roleNamesByCharacter.set(Number(characterId), [...(roleNamesByCharacter.get(Number(characterId)) ?? []), roleName])
  }
  const memberCharacterIds = new Set(rows.flatMap((row) => row.character ? [Number(row.character.id)] : []))
  const canSearch = role === 'admin'
  const searchResults = canSearch && q ? (await searchActiveCharacters(payload, q)).filter((hit) => !memberCharacterIds.has(hit.id)) : []
  return {
    baseUrl,
    domainSlug: tenant.slug,
    domainName: tenant.name,
    domainId: Number(tenant.id),
    rows: rows.map(({ membership, character, localContext, controllingUser }) => ({
      membershipId: Number(membership.id),
      characterId: character ? Number(character.id) : 0,
      name: character?.name ?? 'Unknown Character',
      localDisplayName: localContext?.localDisplayName ?? null,
      controllingUserName: controllingUser?.name ?? controllingUser?.email ?? null,
      membershipStatus: membership.status === 'active' ? 'active' : 'inactive',
      departments: character ? subdomainsByCharacter.get(Number(character.id)) ?? [] : [],
      roles: character ? roleNamesByCharacter.get(Number(character.id)) ?? [] : [],
    })),
    canSearch,
    searchResults,
    query: q,
    status: null,
    vocabulary: {
      domainSingular: vocab.domain.singular,
      memberPlural: vocab.member.plural,
      subdomainSingular: vocab.subdomain.singular,
      subdomainPlural: vocab.subdomain.plural,
      rolePlural: vocab.role.plural,
    },
  }
}
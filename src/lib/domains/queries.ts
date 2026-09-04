import { getLorePayload } from '@/lib/payload'
import type { Character, Domain, DomainMembership, DomainCharacterContext, Subdomain, RoleAssignment } from '@/payload-types'

export type DomainMemberRow = {
  membership: DomainMembership
  character: Character | null
  localContext: DomainCharacterContext | null
  controllingUser: { id: number; name?: string | null; email?: string | null } | null
}

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function getDomainBySlug(slug: string): Promise<Domain | null> {
  const payload = await getLorePayload()
  const result = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 1, limit: 1 })
  return result.docs[0] ?? null
}

export async function getSubdomainsForDomain(domainId: number | string): Promise<Subdomain[]> {
  const payload = await getLorePayload()
  const result = await payload.find({ collection: 'subdomains', where: { domain: { equals: domainId } }, depth: 1, limit: 100, sort: 'sortOrder' })
  return result.docs
}

export async function getSubdomainBySlug(domainId: number | string, slug: string): Promise<Subdomain | null> {
  const payload = await getLorePayload()
  const result = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { slug: { equals: slug } }] }, depth: 1, limit: 1 })
  return result.docs[0] ?? null
}

export async function getDomainMemberRows(domain: Domain): Promise<DomainMemberRow[]> {
  const payload = await getLorePayload()
  const memberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { status: { equals: 'active' } }] }, depth: 1, limit: 500, sort: 'updatedAt' })
  const contexts = await payload.find({ collection: 'domain-character-contexts', where: { domain: { equals: domain.id } }, depth: 1, limit: 500 })
  const contextByCharacter = new Map(contexts.docs.map((context) => [String(relationId(context.character)), context]))
  return memberships.docs.map((membership) => {
    const character = typeof membership.character === 'object' ? membership.character : null
    const controller = character?.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
    return { membership, character, localContext: contextByCharacter.get(String(relationId(membership.character))) ?? null, controllingUser: controller ? { id: Number(controller.id), name: controller.name, email: controller.email } : null }
  })
}

/**
 * Department participants: active RoleAssignments for Roles in the Department,
 * restricted to Characters with active Domain membership. Named truthfully
 * (P05R-T06 C) — it computes derived participation, not SubdomainMembership rows.
 */
export async function getDepartmentParticipants(subdomainId: number | string): Promise<RoleAssignment[]> {
  const payload = await getLorePayload()
  const subdomain = await payload.findByID({ collection: 'subdomains', id: subdomainId, depth: 0 }).catch(() => null)
  const domainId = relationId(subdomain?.domain)
  if (!domainId) return []
  const roles = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: domainId } }, { subdomain: { equals: subdomainId } }, { active: { equals: true } }] }, depth: 0, limit: 500 })
  if (roles.docs.length === 0) return []
  const assignments = await payload.find({ collection: 'role-assignments', where: { and: [{ role: { in: roles.docs.map((role) => role.id) } }, { status: { equals: 'active' } }] }, depth: 1, limit: 1000 })
  const domainMembers = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1000 })
  const activeCharacterIds = new Set(domainMembers.docs.map((membership) => String(relationId(membership.character))))
  return assignments.docs.filter((assignment) => activeCharacterIds.has(String(relationId(assignment.character))))
}

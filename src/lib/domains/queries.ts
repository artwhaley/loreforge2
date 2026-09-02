import { getLorePayload } from '@/lib/payload'
import type { Character, Domain, DomainMembership, DomainCharacterContext, Subdomain, SubdomainMembership } from '@/payload-types'

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

export async function getSubdomainMemberships(subdomainId: number | string): Promise<SubdomainMembership[]> {
  const payload = await getLorePayload()
  const result = await payload.find({ collection: 'subdomain-memberships', where: { and: [{ subdomain: { equals: subdomainId } }, { status: { equals: 'active' } }] }, depth: 1, limit: 500 })
  return result.docs
}

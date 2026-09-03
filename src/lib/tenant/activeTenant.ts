import { cookies } from 'next/headers.js'
import { getLorePayload } from '@/lib/payload'

import type { Character, Domain, Tenant } from '@/payload-types'

export const ACTIVE_TENANT_COOKIE = 'sl-civic-active-tenant'
export const ACTIVE_CHARACTER_COOKIE = 'sl-civic-active-character'

export type ContextUser = { id: number; name?: string; email?: string }

export type ActiveContext = {
  tenant: (Domain | Tenant) | null
  role: 'admin' | 'member' | null
  user: ContextUser | null
  activeCharacter: Character | null
  characters: Character[]
}

/**
 * Active tenant resolution for the MVP.
 *
 * The tenant switcher writes this cookie; server components read it here.
 * A future hostname/custom-domain resolver can replace this single function
 * without changing the content model or any calling components.
 *
 * Always validates that the current user participates in or manages the
 * selected Domain, so an arbitrary cookie value cannot expose another city's
 * content.
 */
export async function getActiveContext(): Promise<ActiveContext> {
  const payload = await getLorePayload()
  const headers = await import('next/headers.js').then((m) => m.headers())
  const { user } = await payload.auth({ headers })
  const contextUser = user ? { id: Number(user.id), name: user.name, email: user.email } : null

  if (!user) {
    return { tenant: null, role: null, user: null, activeCharacter: null, characters: [] }
  }

  const characterResult = await payload.find({
    collection: 'characters',
    where: {
      and: [{ controlledBy: { equals: user.id } }, { status: { equals: 'active' } }],
    },
    depth: 1,
    limit: 100,
    sort: 'name',
  })
  const characters = characterResult.docs
  const cookieStore = await cookies()
  const activeCharacterRaw = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value
  const activeCharacterId = activeCharacterRaw ? Number(activeCharacterRaw) : NaN
  const activeCharacter = Number.isFinite(activeCharacterId)
    ? characters.find((character) => Number(character.id) === activeCharacterId) ?? null
    : null

  const cookieValue = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value

  if (!cookieValue) {
    return { tenant: null, role: null, user: contextUser, activeCharacter, characters }
  }

  // The selected Domain is independent of the acting Character. Character
  // eligibility is checked below without silently selecting another identity.
  const tenants = await payload.find({
    collection: 'domains',
    where: { slug: { equals: cookieValue } },
    depth: 1,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    return { tenant: null, role: null, user: contextUser, activeCharacter, characters }
  }

  // A Domain can be selected by a User who manages it even when they have no
  // participating Character. Character participation remains a separate,
  // narrower requirement for roleplay actions.
  const domainAdmins = await payload.find({
    collection: 'domain-admins',
    where: { and: [{ domain: { equals: tenant.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: 1,
  })
  const isDomainAdmin = Number(tenant.ownerUser && typeof tenant.ownerUser === 'object' ? tenant.ownerUser.id : tenant.ownerUser) === Number(user.id) || domainAdmins.docs.length > 0
  const activeMembership = activeCharacter
    ? await payload.find({
        collection: 'domain-memberships',
        where: { and: [{ character: { equals: activeCharacter.id } }, { or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { status: { equals: 'active' } }] },
        depth: 0,
        limit: 1,
      })
    : { docs: [] }

  const eligibleActiveCharacter = activeMembership.docs[0] ? activeCharacter : null
  if (isDomainAdmin) return { tenant, role: 'admin', user: contextUser, activeCharacter: eligibleActiveCharacter, characters }

  const controlledIds = characters.map((character) => character.id)
  const anyMembership = controlledIds.length
    ? await payload.find({ collection: 'domain-memberships', where: { and: [{ character: { in: controlledIds } }, { or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
    : { docs: [] }
  if (anyMembership.docs.length === 0) return { tenant: null, role: null, user: contextUser, activeCharacter: null, characters }

  return { tenant, role: 'member', user: contextUser, activeCharacter: eligibleActiveCharacter, characters }
}

export async function getActiveTenant(): Promise<{
  tenant: (Domain | Tenant) | null
  role: 'admin' | 'member' | null
  user: ContextUser | null
  activeCharacter: Character | null
  characters: Character[]
}> {
  const context = await getActiveContext()
  return context
}

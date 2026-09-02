import { cookies } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Character, Tenant } from '@/payload-types'

export const ACTIVE_TENANT_COOKIE = 'sl-civic-active-tenant'
export const ACTIVE_CHARACTER_COOKIE = 'sl-civic-active-character'

export type ContextUser = { id: number; name?: string; email?: string }

export type ActiveContext = {
  tenant: Tenant | null
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
 * Always validates that the current user is a member of the tenant, so an
 * arbitrary cookie value cannot expose another city's content.
 */
export async function getActiveContext(): Promise<ActiveContext> {
  const payload = await getPayload({ config })
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

  // P02-T02 deliberately clears Domain when Character changes. P02-T03 now
  // validates the selected Domain against the active Character membership.
  if (!activeCharacter) {
    return { tenant: null, role: null, user: contextUser, activeCharacter: null, characters }
  }

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: cookieValue } },
    depth: 1,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    return { tenant: null, role: null, user: contextUser, activeCharacter, characters }
  }

  // Membership check: only members/admins of this tenant may activate it.
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: {
      and: [
        { character: { equals: activeCharacter.id } },
        { tenant: { equals: tenant.id } },
        { status: { equals: 'active' } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  const membership = memberships.docs[0]
  if (!membership) {
    return { tenant: null, role: null, user: contextUser, activeCharacter, characters }
  }

  // The legacy role is retained only as a transitional display/authorization
  // seam until P03-T01 migrates owner/admin authority to the Domain model.
  const legacyMemberships = await payload.find({
    collection: 'memberships',
    where: {
      and: [{ user: { equals: user.id } }, { tenant: { equals: tenant.id } }],
    },
    depth: 0,
    limit: 1,
  })
  const legacyRole = legacyMemberships.docs[0]?.role

  return {
    tenant,
    role: legacyRole === 'admin' || legacyRole === 'member' ? legacyRole : null,
    user: contextUser,
    activeCharacter,
    characters,
  }
}

export async function getActiveTenant(): Promise<{
  tenant: Tenant | null
  role: 'admin' | 'member' | null
  user: ContextUser | null
  activeCharacter: Character | null
  characters: Character[]
}> {
  const context = await getActiveContext()
  return context
}

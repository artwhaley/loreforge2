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

  // P07X-T02: the selector list is the User's acting identities — ordinary
  // Characters plus any provisioned platform_admin / domain_admin identities
  // (scope filtering happens per selected Domain in findDomainIdentities).
  const { findDashboardIdentities } = await import('@/lib/characters/identitySelect')
  const characters = await findDashboardIdentities(payload, user.id)
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

  // P07X-T02: authority is identity-driven. The selected Domain may still be
  // reached by a User-level manager before identities are provisioned (UI
  // compatibility), but every privileged action is re-authorized server-side
  // against the acting Character.
  const { isIdentityValidInDomain } = await import('@/lib/characters/identitySelect')
  const domainAdmins = await payload.find({
    collection: 'domain-admins',
    where: { and: [{ domain: { equals: tenant.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: 1,
  })
  const ownerUserId = Number(tenant.ownerUser && typeof tenant.ownerUser === 'object' ? tenant.ownerUser.id : tenant.ownerUser)
  const isUserLevelManager = Boolean(user.isPlatformAdmin) || ownerUserId === Number(user.id) || domainAdmins.docs.length > 0
  const userIsPlatformAdmin = Boolean(user.isPlatformAdmin)
  const eligibleActiveCharacter = activeCharacter && await isIdentityValidInDomain(payload, { userId: user.id, characterId: activeCharacter.id, domainId: tenant.id, userIsPlatformAdmin }) ? activeCharacter : null

  const actingKind = String((eligibleActiveCharacter as { kind?: string } | null)?.kind ?? '')
  const actingAdministrativeDomain = eligibleActiveCharacter ? Number((eligibleActiveCharacter as { administrativeDomain?: unknown }).administrativeDomain && typeof (eligibleActiveCharacter as { administrativeDomain?: unknown }).administrativeDomain === 'object' ? ((eligibleActiveCharacter as { administrativeDomain?: { id?: number } }).administrativeDomain as { id?: number })?.id : (eligibleActiveCharacter as { administrativeDomain?: unknown }).administrativeDomain) : NaN
  const identityIsDomainAdmin = actingKind === 'domain_admin' && actingAdministrativeDomain === Number(tenant.id)
  // Platform identity is NOT a Domain administrator role; platform tools are a
  // separate surface gated by the platform seam.
  const role: 'admin' | 'member' | null = identityIsDomainAdmin || (actingKind !== 'platform_admin' && isUserLevelManager) ? 'admin' : eligibleActiveCharacter ? 'member' : isUserLevelManager ? 'admin' : null

  if (role === null) return { tenant: null, role: null, user: contextUser, activeCharacter: null, characters }

  return { tenant, role, user: contextUser, activeCharacter: eligibleActiveCharacter, characters }
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

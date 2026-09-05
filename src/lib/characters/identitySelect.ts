import type { Payload } from 'payload'

import type { Character } from '@/payload-types'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/**
 * P07X-T02 — acting-identity selection scope.
 *
 * The acting selector shows the User's provisioned administrative identities
 * when they are eligible for the current context, plus ordinary Characters:
 * - dashboard (no Domain selected): every active controlled identity,
 *   including platform_admin and every owned-domain domain_admin;
 * - inside a selected Domain: active member Characters, plus platform_admin
 *   (platform identity is eligible in any Domain context), plus the
 *   domain_admin whose administrativeDomain is exactly that Domain.
 *
 * Administrative kinds are never ordinary members; their Domain scope comes
 * from kind, so a domain_admin is shown only for its own Domain.
 */

export async function findDashboardIdentities(payload: Payload, userId: number | string): Promise<Character[]> {
  const rows = await payload.find({
    collection: 'characters',
    where: { and: [{ controlledBy: { equals: userId } }, { status: { equals: 'active' } }] },
    depth: 1,
    limit: 0,
    pagination: false,
    sort: 'name',
  })
  return rows.docs as unknown as Character[]
}

export async function findDomainIdentities(payload: Payload, args: { userId: number | string; domainId: number | string }): Promise<Character[]> {
  const userIdNumber = Number(args.userId)
  const domainIdNumber = Number(args.domainId)
  const memberRows = await payload.find({
    collection: 'domain-memberships',
    where: { and: [{ or: [{ domain: { equals: domainIdNumber } }, { tenant: { equals: domainIdNumber } }] }, { status: { equals: 'active' } }] },
    depth: 1,
    limit: 0,
    pagination: false,
  })
  const ordinary = memberRows.docs
    .map((membership) => (membership as { character?: unknown }).character)
    .filter((character): character is Character => {
      if (!character || typeof character !== 'object') return false
      const row = character as unknown as { status?: string; kind?: string; controlledBy?: unknown }
      if (row.status !== 'active') return false
      if (row.kind === 'domain_admin' || row.kind === 'platform_admin') return false
      return idOf(row.controlledBy) === userIdNumber
    })
  // Provisioned administrative identities for this context.
  const adminRows = await payload.find({
    collection: 'characters',
    where: {
      and: [
        { controlledBy: { equals: userIdNumber } },
        { status: { equals: 'active' } },
        { or: [{ kind: { equals: 'platform_admin' } }, { kind: { equals: 'domain_admin' } }] },
      ],
    },
    depth: 1,
    limit: 0,
    pagination: false,
    sort: 'name',
  })
  const user = await payload.findByID({ collection: 'users', id: userIdNumber, depth: 0, overrideAccess: true }).catch(() => null) as { isPlatformAdmin?: unknown } | null
  const seen = new Set(ordinary.map((character) => String(character.id)))
  const administrative: Character[] = []
  for (const character of adminRows.docs as unknown as Character[]) {
    const row = character as unknown as { kind?: string; administrativeDomain?: unknown }
    if (row.kind === 'platform_admin') {
      if (!user?.isPlatformAdmin) continue
    } else if (row.kind === 'domain_admin') {
      if (idOf(row.administrativeDomain) !== domainIdNumber) continue
    } else {
      continue
    }
    if (seen.has(String(character.id))) continue
    administrative.push(character)
    seen.add(String(character.id))
  }
  return [...ordinary, ...administrative]
}

/**
 * True when an acting Character is valid for the selected Domain context:
 * an active member Character, the Platform Administrator identity (any
 * Domain), or the domain_admin of exactly that Domain.
 */
export async function isIdentityValidInDomain(payload: Payload, args: { userId: number | string; characterId: number | string | null | undefined; domainId: number | string; domainOwnerUser?: unknown; userIsPlatformAdmin?: boolean }): Promise<boolean> {
  if (args.characterId == null || args.characterId === '') return false
  const characterIdNumber = Number(args.characterId)
  const domainIdNumber = Number(args.domainId)
  const character = await payload.findByID({ collection: 'characters', id: characterIdNumber, depth: 0, overrideAccess: true }).catch(() => null) as { status?: string; kind?: string; controlledBy?: unknown; administrativeDomain?: unknown } | null
  if (!character || character.status !== 'active' || idOf(character.controlledBy) !== Number(args.userId)) return false
  const kind = String(character.kind ?? 'player')
  if (kind === 'platform_admin') return Boolean(args.userIsPlatformAdmin)
  if (kind === 'domain_admin') return idOf(character.administrativeDomain) === domainIdNumber
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: { and: [{ or: [{ domain: { equals: domainIdNumber } }, { tenant: { equals: domainIdNumber } }] }, { character: { equals: characterIdNumber } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return memberships.docs.length > 0
}
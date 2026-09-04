import type { Payload } from 'payload'

import { evaluatePermission, type PermissionActor, type PermissionDecision } from './evaluate'
import type { Capability } from '@/lib/permissions/capabilities'
import type { ResourceRef } from './resourceTree'

export type AuthorizationContext = PermissionActor & { domainId: number; domainSlug: string; characterMember: boolean; userLevel: boolean }

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/** Resolve selected Domain + optional acting Character without inventing a mode. */
export async function resolveAuthorizationContext(payload: Payload, args: { userId: number | string; domainId: number | string; activeCharacterId?: number | string | null }): Promise<AuthorizationContext | null> {
  const domain = await payload.findByID({ collection: 'domains', id: args.domainId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!domain) return null
  const ownerId = idOf((domain as { ownerUser?: unknown }).ownerUser)
  const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domain.id } }, { user: { equals: args.userId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const userLevel = Number(ownerId) === Number(args.userId) || admins.docs.length > 0
  let characterMember = false
  if (args.activeCharacterId != null) {
    const rows = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: args.activeCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    characterMember = rows.docs.length > 0
  }
  if (!userLevel && !characterMember) return null
  return { userId: Number(args.userId), activeCharacterId: characterMember ? Number(args.activeCharacterId) : null, domainId: Number(domain.id), domainSlug: domain.slug, characterMember, userLevel }
}

export async function authorizeContext(payload: Payload, context: AuthorizationContext, capability: Capability, resource: ResourceRef): Promise<PermissionDecision> {
  return evaluatePermission({ payload, actor: context, domainId: context.domainId, capability, resource })
}

import type { Payload } from 'payload'

/**
 * P07X-T02 — explicit platform-authorization seam.
 *
 * Platform operations are NOT a Domain authorization bypass. They require:
 * - an authenticated User who is still platform-admin eligible;
 * - an active acting Character controlled by that User;
 * - Character.kind === 'platform_admin'.
 *
 * A domain_admin can never pass this seam, and this seam never grants
 * ordinary Domain record authority (that stays with the Domain evaluator,
 * where platform_admin has no bypass).
 */

export type PlatformActor = { userId: number | string; activeCharacterId?: number | string | null }

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export type PlatformDecision = { allowed: true } | { allowed: false; reason: string }

export async function authorizePlatformOperation(payload: Payload, actor: PlatformActor, options: { transactionID?: number | string | null } = {}): Promise<PlatformDecision> {
  if (actor.activeCharacterId == null || actor.activeCharacterId === '') {
    return { allowed: false, reason: 'Acting as the Platform Administrator identity is required for platform operations.' }
  }
  const req = options.transactionID == null ? undefined : { transactionID: options.transactionID }
  const userId = Number(actor.userId)
  const [user, character] = await Promise.all([
    payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true, req }).catch(() => null),
    payload.findByID({ collection: 'characters', id: actor.activeCharacterId as number | string, depth: 0, overrideAccess: true, req }).catch(() => null),
  ])
  if (!user || !user.isPlatformAdmin) return { allowed: false, reason: 'Platform-admin eligibility is required.' }
  const row = character as { status?: string; kind?: string; controlledBy?: unknown } | null
  if (!row || row.status !== 'active' || String(row.kind ?? '') !== 'platform_admin') {
    return { allowed: false, reason: 'Acting as the Platform Administrator identity is required for platform operations.' }
  }
  if (idOf(row.controlledBy) !== userId) return { allowed: false, reason: 'Forged acting Character.' }
  return { allowed: true }
}

export async function requirePlatformOperation(payload: Payload, actor: PlatformActor, options: { transactionID?: number | string | null } = {}): Promise<PlatformDecision> {
  const decision = await authorizePlatformOperation(payload, actor, options)
  if (!decision.allowed) throw new Error(decision.reason)
  return decision
}

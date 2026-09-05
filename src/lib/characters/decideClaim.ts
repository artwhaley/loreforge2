import type { Payload } from 'payload'
import { runInTransaction } from '@/lib/db/transactions'
import { isAllowed, type PermissionActor } from '@/lib/authz/evaluate'
import { applyClaimDecision } from './claims'

const idOf = (v: unknown): number => Number(v && typeof v === 'object' && 'id' in v ? v.id : v)

/** Claim and controller change are one transaction; recheck after taking the lock. */
export async function decideCharacterClaim(payload: Payload, args: { actor: PermissionActor; domainId: number; characterId: number; claimId: number; decision: 'approved' | 'rejected'; note?: string }) {
  if (!await isAllowed({ payload, actor: args.actor, domainId: args.domainId, capability: 'manage_claims', resource: { type: 'Domain', id: args.domainId } })) return false
  try { return await runInTransaction(payload, async (transactionID) => {
    const req = { transactionID }
    const claim = await payload.findByID({ collection: 'character-claim-requests', id: args.claimId, depth: 0, req }).catch(() => null)
    if (!claim || idOf(claim.domain) !== args.domainId || idOf(claim.character) !== args.characterId) return false
    const character = await payload.findByID({ collection: 'characters', id: args.characterId, depth: 0, req })
    if (character.status !== 'active') return false
    // P07X-T01: administrative kinds can never enter ordinary claim flows.
    if (character.kind === 'domain_admin' || character.kind === 'platform_admin') return false
    const result = applyClaimDecision({ status: claim.status, characterControlledBy: character.controlledBy ? idOf(character.controlledBy) : null }, args.decision, idOf(claim.claimant), { userId: args.actor.userId, authorized: true })
    if (typeof result === 'string') return false
    if (args.decision === 'approved') await payload.update({ collection: 'characters', id: character.id, data: { controlledBy: Number(result.characterControlledBy) }, req })
    await payload.update({ collection: 'character-claim-requests', id: claim.id, data: { status: result.status, decidedAt: new Date().toISOString(), decidedBy: Number(args.actor.userId), decidingCharacter: args.actor.activeCharacterId ? Number(args.actor.activeCharacterId) : null, decisionNote: args.note }, req })
    return true
  }) } catch (error) {
    // A competing SQLite writer can lose at BEGIN IMMEDIATE. It has changed
    // nothing; treat it as a refused decision, not a second approval or a 500.
    if (error instanceof Error && /SQLITE_BUSY|database is locked/.test(error.message)) return false
    throw error
  }
}

import type { Payload } from 'payload'

import { recordDomainAudit } from '@/lib/domains/domainAudit'
import { runInTransaction } from '@/lib/db/transactions'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

/** Normalize polymorphic ({ relationTo, value }) or plain relationship ids. */
const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return idOf((value as { value: unknown }).value)
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/**
 * P05R-T05 A: atomically remove a Character's live participation in a Domain.
 *
 * Deletes the Character's RoleAssignments (in-Domain Roles) and their direct
 * Folder PermissionRules, then records ONE durable audit event. Every mutation
 * runs in a single DB transaction:
 * - called from the DomainMemberships afterChange hook it JOINS the outer
 *   operation's transaction (the hook passes transactionID from its req), so
 *   the membership status flip, the cascade, and the audit commit or roll back
 *   together — a hook throw rolls the whole outer op back;
 * - called standalone (tests, sanctioned-route use) it opens its own
 *   transaction via runInTransaction.
 *
 * The audit event is the LAST step, so a failure anywhere leaves no false
 * "successful removal" record. Unrelated Domains are never touched: every
 * query is scoped to (domainId, characterId).
 *
 * `simulateFailureAt` is a test-only seam used by the P05R-T05 acceptance
 * suite to prove mid-cascade rollback; production callers never set it.
 */
export async function deactivateDomainParticipation(args: {
  payload: Payload
  domainId: number | string
  characterId: number | string
  membershipId?: number | string | null
  actorUser?: number | string | null
  actorCharacter?: number | string | null
  /** Join an existing transaction (the afterChange hook path). */
  transactionID?: number | string | null
  /** Test seam: throw right before the Folder-rule deletion step. */
  simulateFailureAt?: 'folderRules' | null
}): Promise<void> {
  const { payload, domainId, characterId, membershipId, actorUser, actorCharacter } = args

  const execute = async (transactionID: number | string | null) => {
    const txReq = transactionID == null ? undefined : { transactionID }
    const removedRoleAssignmentIds: Array<number | string> = []
    const removedFolderRuleIds: Array<number | string> = []

    const roles = await payload.find({
      collection: 'roles',
      where: { domain: { equals: domainId } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req: txReq,
    })
    const roleIds = roles.docs.map((role) => role.id)
    const assignments = roleIds.length === 0 ? { docs: [] } : await payload.find({
      collection: 'role-assignments',
      where: {
        and: [
          { role: { in: roleIds } },
          { character: { equals: characterId } },
          { status: { equals: 'active' } },
        ],
      },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req: txReq,
    })
    for (const assignment of assignments.docs) {
      await payload.delete({ collection: 'role-assignments', id: assignment.id, overrideAccess: true, req: txReq })
      removedRoleAssignmentIds.push(assignment.id)
    }

    // Failure-injection seam: the Folder-rule deletion step throws, and the
    // whole removal (including the already-deleted assignments and the audit)
    // must roll back. See the P05R-T05 acceptance test.
    if (args.simulateFailureAt === 'folderRules') {
      throw new Error('P05R-T05 injected failure at Folder-rule deletion step')
    }

    // The polymorphic principal/resource fields cannot be filtered with plain
    // equals on this adapter (Drizzle throws, and a thrown find inside a joined
    // transaction would kill the whole outer transaction — P05R-T05 evidence).
    // Query the plain columns and filter principal client-side, matching the
    // app's established pattern. A query failure here must FAIL the removal
    // loudly, never be swallowed.
    const ruleRows = await payload.find({
      collection: 'permission-rules',
      where: {
        and: [
          { domain: { equals: domainId } },
          { principalType: { equals: 'Character' } },
          { resourceType: { equals: 'Folder' } },
        ],
      },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req: txReq,
    })
    const directRules = { docs: ruleRows.docs.filter((rule) => idOf((rule as { principal?: unknown }).principal) === Number(characterId)) }
    for (const rule of directRules.docs) {
      await payload.delete({ collection: 'permission-rules', id: rule.id, overrideAccess: true, req: txReq })
      removedFolderRuleIds.push(rule.id)
    }

    // Durable audit is the atomic unit's final step: a failure above leaves no
    // false "deactivated" record, and this event commits/rolls back with the
    // rest of the removal.
    await recordDomainAudit({
      payload,
      domainId,
      eventType: 'membership_changed',
      actorUser,
      actorCharacter,
      targetType: 'domain-membership',
      targetId: membershipId == null ? String(characterId) : String(membershipId),
      action: 'deactivated',
      context: {
        characterId: Number(characterId),
        priorStatus: 'active',
        removedRoleAssignmentIds,
        removedFolderRuleIds,
      },
      transactionID,
    })
  }

  if (args.transactionID != null) {
    await execute(args.transactionID)
    return
  }
  await runInTransaction(payload, (transactionID) => execute(transactionID))
}

export { relationId }

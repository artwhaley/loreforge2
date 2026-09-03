import type { Payload } from 'payload'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

/** Remove all live narrower assignments when Domain membership is removed.
 * History is retained in the application log; no reusable assignment row is
 * left for a later Domain re-add to revive.
 */
export async function deactivateDomainParticipation(
  payload: Payload,
  domainId: number | string,
  characterId: number | string,
): Promise<void> {
  const roles = await payload.find({
    collection: 'roles',
    where: { domain: { equals: domainId } },
    depth: 0,
    limit: 500,
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
    limit: 500,
  })
  for (const assignment of assignments.docs) {
    payload.logger.info(`P05-T00 audit: removed RoleAssignment=${assignment.id} domain=${domainId} character=${characterId}`)
    await payload.delete({ collection: 'role-assignments', id: assignment.id })
  }

  const directRules = await payload.find({
    collection: 'permission-rules',
    where: {
      and: [
        { domain: { equals: domainId } },
        { principalType: { equals: 'Character' } },
        { principal: { equals: characterId } },
      ],
    },
    depth: 0,
    limit: 500,
  }).catch(() => ({ docs: [] }))
  for (const rule of directRules.docs) {
    payload.logger.info(`P05-T00 audit: removed direct PermissionRule=${rule.id} domain=${domainId} character=${characterId}`)
    await payload.delete({ collection: 'permission-rules', id: rule.id })
  }
}

export { relationId }

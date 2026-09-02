import type { Payload } from 'payload'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

/**
 * A Domain membership is the prerequisite for every narrower participation
 * grant. When it is deactivated, retain the historical rows but deactivate
 * the Character's Subdomain memberships and Role assignments as well. A
 * later Domain re-add therefore requires explicit, deliberate re-adds to
 * each Subdomain and Role.
 */
export async function deactivateDomainParticipation(
  payload: Payload,
  domainId: number | string,
  characterId: number | string,
): Promise<void> {
  const subdomains = await payload.find({
    collection: 'subdomains',
    where: { domain: { equals: domainId } },
    depth: 0,
    limit: 500,
  })
  const subdomainIds = subdomains.docs.map((subdomain) => subdomain.id)
  if (subdomainIds.length > 0) {
    const memberships = await payload.find({
      collection: 'subdomain-memberships',
      where: {
        and: [
          { subdomain: { in: subdomainIds } },
          { character: { equals: characterId } },
          { status: { equals: 'active' } },
        ],
      },
      depth: 0,
      limit: 500,
    })
    for (const membership of memberships.docs) {
      await payload.update({
        collection: 'subdomain-memberships',
        id: membership.id,
        data: { status: 'inactive' },
      })
    }
  }

  const roles = await payload.find({
    collection: 'roles',
    where: { domain: { equals: domainId } },
    depth: 0,
    limit: 500,
  })
  const roleIds = roles.docs.map((role) => role.id)
  if (roleIds.length === 0) return

  const assignments = await payload.find({
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
    await payload.update({
      collection: 'role-assignments',
      id: assignment.id,
      data: { status: 'inactive' },
    })
  }
}

export { relationId }

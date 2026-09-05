import type { Payload } from 'payload'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export type RoleNode = { id: number; domainId: number; departmentId: number; parentId: number | null; active: boolean; name?: string }

export function isRoleDescendant(roleId: number, ancestorId: number, roles: RoleNode[]): boolean {
  const byId = new Map(roles.map((role) => [role.id, role]))
  let cursor = byId.get(roleId)
  const visited = new Set<number>()
  while (cursor?.parentId !== null && cursor?.parentId !== undefined) {
    if (visited.has(cursor.id)) return false
    visited.add(cursor.id)
    if (cursor.parentId === ancestorId) return true
    cursor = byId.get(cursor.parentId)
  }
  return false
}

export function roleMatchesHeldRole(ruleRoleId: number, heldRoleIds: number[], roles: RoleNode[]): boolean {
  return heldRoleIds.some((held) => ruleRoleId === held || isRoleDescendant(ruleRoleId, held, roles))
}

export async function getRoleTree(payload: Payload, domainId: number | string): Promise<RoleNode[]> {
  const result = await payload.find({ collection: 'roles', where: { domain: { equals: domainId } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  return result.docs.map((role) => ({ id: Number(role.id), domainId: Number(idOf(role.domain)), departmentId: Number(idOf(role.subdomain)), parentId: idOf(role.parentRole), active: Boolean(role.active) }))
}

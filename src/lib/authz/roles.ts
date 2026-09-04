import type { Payload } from 'payload'
import { getRoleTree, type RoleNode } from './roleTree'

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

/** Role assignments contain only Character + Role; Folder access is never copied onto them. */
export async function getHeldRoles(payload: Payload, args: { domainId: number | string; characterId: number | string }): Promise<RoleNode[]> {
  const roles = await getRoleTree(payload, args.domainId)
  const assignments = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: args.characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  const held = new Set(assignments.docs.map((assignment) => idOf(assignment.role)).filter((id): id is number => id !== null))
  return roles.filter((role) => role.active && held.has(role.id))
}

/** Return Role-owned default rules, leaving direct Character rules untouched. */
export async function getRoleDefaultRules(payload: Payload, args: { domainId: number | string; roleId: number | string }) {
  return payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: args.domainId } }, { principalType: { equals: 'Role' } }, { principal: { equals: args.roleId } }, { active: { equals: true } }] }, depth: 1, limit: 0, pagination: false, overrideAccess: true })
}

/** Role-derived Department participation: no SubdomainMembership row is created. */
export async function getParticipatingDepartmentIds(payload: Payload, args: { domainId: number | string; characterId: number | string }): Promise<number[]> {
  const roles = await getHeldRoles(payload, args)
  return [...new Set(roles.map((role) => role.departmentId))]
}

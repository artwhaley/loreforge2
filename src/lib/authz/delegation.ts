import type { Payload } from 'payload'

import { evaluatePermission, type PermissionActor } from './evaluate'
import { isRoleDescendant, getRoleTree } from './roleTree'
import type { Capability } from '@/lib/permissions/capabilities'
import type { ResourceRef } from './resourceTree'

export async function assertCanDelegate(payload: Payload, actor: PermissionActor, domainId: number | string, capability: Capability, resource: ResourceRef, operation: 'grant' | 'deny' | 'revoke' = 'grant') {
  const manage = await evaluatePermission({ payload, actor, domainId, capability: 'manage_access', resource })
  if (!manage.allowed) throw new Error('The actor does not have manage_access on this scope.')
  if (operation === 'grant') {
    const possess = await evaluatePermission({ payload, actor, domainId, capability, resource })
    if (!possess.allowed) throw new Error(`The actor cannot delegate ${capability} they do not possess.`)
  }
  return true
}

export async function canCreateRole(payload: Payload, args: { actor: PermissionActor; domainId: number | string; departmentId: number | string }) {
  const roleCreate = await evaluatePermission({ payload, actor: args.actor, domainId: args.domainId, capability: 'manage_roles', resource: { type: 'Subdomain', id: args.departmentId } })
  return roleCreate.allowed
}

export async function assertCanCreateRole(payload: Payload, args: { actor: PermissionActor; domainId: number | string; departmentId: number | string }) {
  if (!(await canCreateRole(payload, args))) throw new Error('You cannot create Roles in this Department.')
}

export async function canAssignRole(payload: Payload, args: { actor: PermissionActor; domainId: number | string; targetRoleId: number | string }) {
  const roles = await getRoleTree(payload, args.domainId)
  const target = roles.find((role) => role.id === Number(args.targetRoleId))
  if (!target || !target.active) return false
  const direct = await evaluatePermission({ payload, actor: args.actor, domainId: args.domainId, capability: 'assign_roles', resource: { type: 'Subdomain', id: target.departmentId } })
  if (direct.allowed) return true
  const assignments: { docs: Array<{ role: unknown }> } = args.actor.activeCharacterId == null ? { docs: [] } : await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: args.actor.activeCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 10000, overrideAccess: true })
  const held = assignments.docs.map((row) => Number(row.role && typeof row.role === 'object' && 'id' in row.role ? (row.role as { id: number | string }).id : row.role)).filter((id) => Number.isFinite(id))
  return held.some((heldId) => roles.find((role) => role.id === heldId)?.departmentId === target.departmentId && isRoleDescendant(target.id, heldId, roles))
}

export async function assertCanAssignRole(payload: Payload, args: { actor: PermissionActor; domainId: number | string; targetRoleId: number | string }) {
  if (!(await canAssignRole(payload, args))) throw new Error('You may assign only Roles authorized by your current authority or subordinate Role chain.')
}

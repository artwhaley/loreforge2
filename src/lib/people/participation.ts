/**
 * Pure Department-participation and role-assignability helpers (P05R-T03 E/B).
 *
 * Participation is derived ONLY from active RoleAssignments joined to Roles —
 * never from SubdomainMembership or any legacy row — so a Character appears in
 * a Department exactly when they hold at least one Role there, and disappears
 * when their last Role is removed.
 */

export type AssignmentLike = { characterId: number | string; roleId: number | string; active?: boolean | null }
export type RoleLike = { id: number | string; departmentId?: number | string | null; parentRoleId?: number | string | null }

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: unknown }).id) : Number(value)
}

/** One Character's participation: Departments -> the Role ids they hold there. */
export function departmentsForCharacter(characterId: number | string, assignments: AssignmentLike[], roles: RoleLike[]): Map<number, number[]> {
  const departmentByRole = new Map<number, number>()
  for (const role of roles) {
    const departmentId = num(role.departmentId)
    if (departmentId !== null) departmentByRole.set(Number(num(role.id)), departmentId)
  }
  const participation = new Map<number, number[]>()
  for (const assignment of assignments) {
    if (assignment.active === false) continue
    if (String(num(assignment.characterId)) !== String(num(characterId))) continue
    const roleId = num(assignment.roleId)
    const departmentId = roleId === null ? undefined : departmentByRole.get(Number(roleId))
    if (roleId === null || departmentId === undefined) continue
    const roleIds = participation.get(departmentId) ?? []
    if (!roleIds.includes(roleId)) roleIds.push(roleId)
    participation.set(departmentId, roleIds)
  }
  for (const roleIds of participation.values()) roleIds.sort((a, b) => a - b)
  return participation
}

/**
 * Which Role ids the acting User may assign, conservatively, pre-P07:
 * - Domain Owner / operational Domain Admin (viewerIsAdmin): every in-Domain
 *   Role;
 * - otherwise: Roles in a Department where the actor already holds a Role,
 *   plus descendant Roles (same-Department parent chain) of Roles the actor
 *   holds. Final delegated-role semantics arrive with the P07 evaluator.
 */
export function computeAssignableRoleIds(input: { viewerIsAdmin: boolean; roles: RoleLike[]; actorHeldRoleIds: Array<number | string> }): Set<number> {
  const rolesWithMeta = input.roles.map((role) => ({
    id: Number(num(role.id)),
    departmentId: num(role.departmentId),
    parentRoleId: num(role.parentRoleId),
  })).filter((role) => Number.isFinite(role.id))
  const byId = new Map(rolesWithMeta.map((role) => [role.id, role]))
  const held = new Set(input.actorHeldRoleIds.map((id) => Number(num(id))).filter((id) => Number.isFinite(id)))
  if (input.viewerIsAdmin) return new Set(rolesWithMeta.map((role) => role.id))
  // Otherwise: only Roles the actor holds plus same-Department descendants
  // beneath those held Roles. There is no upward or sideways authority — an
  // actor holding a junior Role cannot assign its parent or a peer Role.
  const assignable = new Set<number>()
  for (const role of rolesWithMeta) {
    if (held.has(role.id)) { assignable.add(role.id); continue }
    let ancestor = role.parentRoleId === null ? null : byId.get(role.parentRoleId)
    while (ancestor && ancestor.departmentId === role.departmentId) {
      if (held.has(ancestor.id)) { assignable.add(role.id); break }
      ancestor = ancestor.parentRoleId === null ? null : byId.get(ancestor.parentRoleId)
    }
  }
  return assignable
}

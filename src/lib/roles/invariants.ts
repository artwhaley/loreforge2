export type RoleLike = { id: number | string; domainId: number | string; subdomainId?: number | string | null; parentRoleId?: number | string | null }
export type RoleAssignmentInput = { characterId: number | string; roleId: number | string; scopeFolderId?: number | string | null }
export type FolderLike = { id: number | string; domainId: number | string; subdomainId?: number | string | null; parentId?: number | string | null }

const same = (a: unknown, b: unknown) => String(a) === String(b)

/** Validate role ownership and immediate-superior hierarchy. */
export function assertRoleHierarchy(role: RoleLike, parent: RoleLike | null, allRoles: RoleLike[]): true {
  if (parent && !same(role.domainId, parent.domainId)) throw new Error('A Role parent must belong to the same Domain.')
  if (role.subdomainId && parent?.subdomainId && !same(role.subdomainId, parent.subdomainId)) throw new Error('A Subdomain Role cannot inherit from a different Subdomain.')
  const byId = new Map(allRoles.map((candidate) => [String(candidate.id), candidate]))
  let current = parent
  const seen = new Set<string>()
  while (current) {
    const key = String(current.id)
    if (same(key, role.id)) throw new Error('Role hierarchies must be acyclic.')
    if (seen.has(key)) throw new Error('Role hierarchies must be acyclic.')
    seen.add(key)
    current = current.parentRoleId == null ? null : byId.get(String(current.parentRoleId)) ?? null
  }
  return true
}

/** A scoped assignment is valid only inside the Role's Domain/Subdomain branch. */
export function assertRoleAssignment(input: RoleAssignmentInput, role: RoleLike, scopeFolder: FolderLike | null): true {
  if (!input.characterId || !input.roleId) throw new Error('Character and Role are required for an assignment.')
  if (scopeFolder) {
    if (!same(scopeFolder.domainId, role.domainId)) throw new Error('A Role scope Folder must belong to the Role Domain.')
    if (role.subdomainId && !same(scopeFolder.subdomainId, role.subdomainId)) throw new Error('A Role scope Folder must belong to the Role Subdomain branch.')
  }
  return true
}

/** Multiple active Roles are intentional and must not be collapsed into one role. */
export function assertMultiRoleAssignment(assignments: RoleAssignmentInput[]): true {
  if (assignments.length < 2) throw new Error('Expected at least two Role assignments for a multi-Role Character.')
  const distinct = new Set(assignments.map((assignment) => String(assignment.roleId)))
  if (distinct.size < 2) throw new Error('A multi-Role Character must hold distinct Roles.')
  return true
}

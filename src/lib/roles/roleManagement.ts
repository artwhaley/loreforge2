import type { FolderTreeNode, PermissionState, RoleDepartment, RoleTreeNode } from '@/components/people/PersonAccessTrees'

import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'

/**
 * Pure Role-management helpers (OBSIDIAN-T04). Shared by every Design's Role
 * manager: tree flattening, folder-state overlay, and the context-menu
 * capability shape. Authorization stays in the server builder and the guarded
 * `/api/roles` / `/api/role-assignments` endpoints.
 */

export function flattenRoleNodes(nodes: RoleTreeNode[]): RoleTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenRoleNodes(node.children)])
}

/** Overlay per-folder access states onto a folder tree (display only). */
export function applyFolderStates(nodes: FolderTreeNode[], states: Record<string, { readState: PermissionState; writeState: PermissionState }>): FolderTreeNode[] {
  return nodes.map((node) => ({ ...node, ...(states[String(node.id)] ?? {}), children: applyFolderStates(node.children, states) }))
}

/**
 * Context-menu affordances for a role in its Department. Mirrors the current
 * RoleManager exactly: create/delete require the Department to be manageable;
 * assign requires the role itself to be assignable. Pure and deterministic so
 * a role absent from `assignableRoleIds` never exposes an assignment control.
 */
export type RoleMenuActionKind = 'create' | 'assign' | 'delete'

export type RoleMenuAction = { kind: RoleMenuActionKind; disabled: boolean }

export function roleMenuActions(input: {
  departmentId: number
  roleId: number
  manageableDepartmentIds: number[]
  assignableRoleIds: number[]
}): RoleMenuAction[] {
  const canManageDepartment = input.manageableDepartmentIds.includes(input.departmentId)
  return [
    { kind: 'create', disabled: !canManageDepartment },
    { kind: 'assign', disabled: !input.assignableRoleIds.includes(input.roleId) },
    { kind: 'delete', disabled: !canManageDepartment },
  ]
}

/** Whether the "New top-level role" affordance is available at all. */
export function canCreateRootRole(model: Pick<RoleManagementPageModel, 'manageableDepartmentIds'>): boolean {
  return model.manageableDepartmentIds.length > 0
}
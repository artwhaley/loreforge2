/**
 * Role-tree filter modes (P05R-T03 B). User-visible filters are exactly
 * "Held roles" and "Roles I can assign" (contract P05-T00:36 / 03:94).
 * "Roles I can assign" is pre-P07 conservative: every Role the interim
 * authorization says the viewer may assign (owner/admin: all; otherwise
 * computed by computeAssignableRoleIds) — the final delegated semantics land
 * with the P07 evaluator.
 */
export type RoleMode = 'held' | 'assignable'

export const ROLE_MODE_LABELS: Record<RoleMode, string> = {
  held: 'Held roles',
  assignable: 'Roles I can assign',
}

export const ROLE_MODES: RoleMode[] = ['held', 'assignable']

export function roleMatchesMode(node: { held: boolean; assignable?: boolean }, mode: RoleMode): boolean {
  if (mode === 'held') return node.held
  return node.assignable ?? true
}

/** Recursively keep a Role tree branch when it matches the mode itself or has matching descendants. */
export function filterRoleTree<T extends { children: T[] }>(node: T, matches: (node: T) => boolean): T | null {
  const children = node.children.map((child) => filterRoleTree(child, matches)).filter((child): child is T => child !== null)
  return matches(node) || children.length > 0 ? { ...node, children } : null
}

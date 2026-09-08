import type { FolderManagementNode } from '@/lib/page-models/management/folders'

/**
 * Pure Folder-management model helpers (OBSIDIAN-T03). No React, no network:
 * the sort/tree/legal-move logic shared by every Design's Folder manager.
 * Authorization stays in the server builder and the guarded `/api/folders`
 * endpoint; these functions only shape what the viewer is already allowed to
 * see and do.
 */

export type FolderSort = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'

/** Recursive display sort; the archive itself stays name-ordered elsewhere. */
export function sortFolderNodes(nodes: FolderManagementNode[], sort: FolderSort): FolderManagementNode[] {
  const compare = (a: FolderManagementNode, b: FolderManagementNode): number => {
    switch (sort) {
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'date-asc': return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
      case 'date-desc': return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
      default: return a.name.localeCompare(b.name)
    }
  }
  return [...nodes].sort(compare).map((node) => ({ ...node, children: sortFolderNodes(node.children, sort) }))
}

export function flattenFolderNodes(nodes: FolderManagementNode[], depth = 0): Array<{ node: FolderManagementNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenFolderNodes(node.children, depth + 1)])
}

/** True when `id` is `node` or any descendant — cycle-prevention building block. */
export function folderContains(node: FolderManagementNode, id: number): boolean {
  return node.id === id || node.children.some((child) => folderContains(child, id))
}

export function findFolderNode(nodes: FolderManagementNode[], id: number): FolderManagementNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findFolderNode(node.children, id)
    if (found) return found
  }
  return null
}

/**
 * Legal move targets for `target`: every folder the actor can manage, never
 * the target itself or its descendants (descendant-cycle prevention), sorted
 * flattened for the picker. `canManageRoot` gates the Domain-root option.
 */
export function legalMoveTargets(nodes: FolderManagementNode[], targetId: number, canManageRoot: boolean): Array<{ node: FolderManagementNode; depth: number }> {
  const target = findFolderNode(nodes, targetId)
  if (!target) return []
  return flattenFolderNodes(nodes).filter(({ node }) => node.canManage !== false && node.id !== targetId && !folderContains(target, node.id) && (node.id !== 0 ? true : canManageRoot))
}

/** Folders the actor may actually create under (canManage or the root). */
export function manageableFolderIds(nodes: FolderManagementNode[], canManageRoot: boolean): number[] {
  const ids = flattenFolderNodes(nodes).filter(({ node }) => node.canManage !== false).map(({ node }) => node.id)
  return canManageRoot ? [...ids, 0] : ids
}

/**
 * Context-menu affordances for one folder node. Mirrors the pre-extraction
 * presentation exactly: "create" is always offered (disabled without
 * `canManage`); rename/move/delete are offered only for non-system-managed
 * folders (each disabled without `canManage`). Pure so every Design gets the
 * same denied-action shape.
 */
export type FolderMenuActionKind = 'create' | 'rename' | 'move' | 'delete'

export type FolderMenuAction = { kind: FolderMenuActionKind; disabled: boolean }

export function folderMenuActions(node: FolderManagementNode): FolderMenuAction[] {
  const actions: FolderMenuAction[] = [{ kind: 'create', disabled: node.canManage === false }]
  if (!node.systemManaged) {
    actions.push(
      { kind: 'rename', disabled: node.canManage === false },
      { kind: 'move', disabled: node.canManage === false },
      { kind: 'delete', disabled: node.canManage === false },
    )
  }
  return actions
}
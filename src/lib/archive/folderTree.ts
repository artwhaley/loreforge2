import type { Folder } from '@/payload-types'

export type FolderNode = {
  folder: Folder
  children: FolderNode[]
}

/** Build a nested tree from a flat folder list, resolving parents by id. */
export function buildFolderTree(folders: Folder[]): FolderNode[] {
  const byId = new Map<number, FolderNode>()
  const roots: FolderNode[] = []

  for (const folder of folders) {
    byId.set(folder.id, { folder, children: [] })
  }
  for (const node of byId.values()) {
    const parentId = parentIdOf(node.folder)
    if (parentId !== null && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** A folder's ancestor chain root-first (excluding the folder itself). */
export function folderPath(folders: Folder[], folderId: number | string): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  const seen = new Set<number>()
  let cur: Folder | undefined = byId.get(Number(folderId))

  while (cur) {
    const parentId = parentIdOf(cur)
    if (parentId === null || seen.has(parentId)) break
    const parent = byId.get(parentId)
    if (!parent) break
    seen.add(parentId)
    path.unshift(parent)
    cur = parent
  }
  return path
}

export type FlatFolder = { folder: Folder; depth: number }

/** Flatten a tree into an ordered list with indentation depth. */
export function flattenFolderTree(nodes: FolderNode[], depth = 0): FlatFolder[] {
  const out: FlatFolder[] = []
  for (const node of nodes) {
    out.push({ folder: node.folder, depth })
    out.push(...flattenFolderTree(node.children, depth + 1))
  }
  return out
}

function parentIdOf(folder: Folder): number | null {
  const parent = folder.parent as Folder | number | null | undefined
  if (!parent) return null
  return typeof parent === 'object' ? parent.id : parent
}

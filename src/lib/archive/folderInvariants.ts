export type FolderLike = { id: number | string; domainId: number | string; parentId?: number | string | null; systemManaged?: boolean }

/** Validate a proposed parent before a folder write. */
export function assertFolderPlacement(folder: FolderLike, parent: FolderLike | null, allFolders: FolderLike[]): true {
  if (!parent) return true
  if (String(folder.domainId) !== String(parent.domainId)) throw new Error('A folder parent must belong to the same Domain.')
  const byId = new Map(allFolders.map((candidate) => [String(candidate.id), candidate]))
  let current: FolderLike | null | undefined = parent
  const seen = new Set<string>()
  while (current) {
    const key = String(current.id)
    if (key === String(folder.id)) throw new Error('Folder cycles are not allowed.')
    if (seen.has(key)) throw new Error('Folder hierarchy contains a cycle.')
    seen.add(key)
    current = current.parentId === null || current.parentId === undefined ? null : byId.get(String(current.parentId))
  }
  return true
}

import type { Payload } from 'payload'

import { compileReadScope } from './readScope'
import { folderControlsSession } from './workspaces'
import type { AuthzSession } from './session'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export type ProjectedFolder = { id: number; name: string; systemManaged: boolean; recordCount: number; children: ProjectedFolder[] }

export type FolderProjection = {
  tree: ProjectedFolder[]
  folderRecordCounts: Map<number, number>
  totalReadable: number
}

type FlatFolder = { id: number; name: string; systemManaged: boolean; parent: number | null }
type Node = { id: number; name: string; systemManaged: boolean; children: Node[] }

function toNode(folder: FlatFolder): Node { return { id: folder.id, name: folder.name, systemManaged: folder.systemManaged, children: [] } }

/**
 * P07X-T04 — permission-aware Folder projection.
 *
 * A Folder is visible to an ordinary acting Character when at least one is
 * true (frozen spec §4):
 * 1. the actor has readable Types/Documents represented there (record count > 0);
 * 2. the Folder is an ancestor needed to reach another visible Folder;
 * 3. the actor has an explicit effective Folder-read grant (container only);
 * 4. the actor has Folder-management authority that requires seeing it.
 *
 * An effective Folder/ancestor deny hides the branch and blocks ordinary
 * access through it — unless the actor holds management authority there.
 * Counts and child names of hidden branches never leave the server. Matching
 * domain_admin authority (authorityBypass) sees the entire Domain.
 */
export async function projectVisibleFolders(args: {
  payload: Payload
  session: AuthzSession
  folders: Array<{ id: number | string; name: string; systemManaged: boolean; parent?: unknown }>
}): Promise<FolderProjection> {
  const { payload, session, folders } = args
  const flat: FlatFolder[] = folders.map((folder) => ({ id: Number(folder.id), name: folder.name, systemManaged: Boolean(folder.systemManaged), parent: idOf(folder.parent) }))
  const byId = new Map<number, FlatFolder>(flat.map((folder) => [folder.id, folder]))

  const scope = await compileReadScope(payload, session)

  // Readable document counts per Folder, filtered by the two-axis record
  // decision server-side (never a client-side recount over hidden rows).
  const folderRecordCounts = new Map<number, number>()
  let totalReadable = 0
  const countWhere: Record<string, unknown> = {
    and: [
      { domain: { equals: session.domainId } },
      { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] },
      ...(scope.authorityBypass ? [] : [
        { id: { not_in: scope.denyDocumentIds.size > 0 ? [...scope.denyDocumentIds] : [-1] } },
        { or: [
          { and: [{ documentType: { in: scope.readableTypeIds.size > 0 ? [...scope.readableTypeIds] : [-1] } }, { folder: { not_in: scope.denyFolderIds.size > 0 ? [...scope.denyFolderIds] : [-1] } }] },
          { id: { in: scope.grantDocumentIds.size > 0 ? [...scope.grantDocumentIds] : [-1] } },
        ] },
      ]),
    ],
  }
  const documents = await payload.find({ collection: 'documents', where: countWhere as never, select: { folder: true }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  for (const document of documents.docs) {
    const folderId = idOf((document as { folder?: unknown }).folder)
    if (folderId == null) continue
    folderRecordCounts.set(folderId, (folderRecordCounts.get(folderId) ?? 0) + 1)
    totalReadable += 1
  }

  // Containers the actor may at least see (explicit Folder-read grants and
  // their ancestors) plus management-authorized Folders.
  const visible = new Set<number>(scope.visibleFolderIds)
  const management = new Set<number>()
  for (const [folderId, control] of folderControlsSession(session, [...byId.keys()])) {
    if (control.canManageAccess) management.add(folderId)
  }
  for (const folderId of folderRecordCounts.keys()) if ((folderRecordCounts.get(folderId) ?? 0) > 0) visible.add(folderId)
  for (const folderId of management) visible.add(folderId)

  // Effective Folder/ancestor deny hides the branch for ordinary access;
  // management authority still sees it.
  for (const folderId of scope.denyFolderIds) {
    if (!management.has(folderId)) visible.delete(folderId)
  }

  // Ancestor closure: any Folder needed to navigate to a visible Folder is
  // itself visible (with its own count).
  const ancestorsOf = (folderId: number): number[] => {
    const chain: number[] = []
    const seen = new Set<number>()
    let parentId = byId.get(folderId)?.parent ?? null
    while (parentId != null && !seen.has(parentId)) {
      seen.add(parentId)
      chain.push(parentId)
      parentId = byId.get(parentId)?.parent ?? null
    }
    return chain
  }
  for (const folderId of [...visible]) for (const ancestorId of ancestorsOf(folderId)) visible.add(ancestorId)

  const nodes = new Map<number, Node>()
  for (const folder of flat) nodes.set(folder.id, toNode(folder))
  const roots: Node[] = []
  for (const folder of flat) {
    const node = nodes.get(folder.id)!
    const parent = folder.parent == null ? null : nodes.get(folder.parent)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const prune = (node: Node): ProjectedFolder | null => {
    if (!visible.has(node.id)) return null
    const children = node.children.map(prune).filter((child): child is ProjectedFolder => child !== null)
    return { id: node.id, name: node.name, systemManaged: node.systemManaged, recordCount: folderRecordCounts.get(node.id) ?? 0, children }
  }
  return { tree: roots.map(prune).filter((child): child is ProjectedFolder => child !== null), folderRecordCounts, totalReadable }
}
import type { Payload } from 'payload'
import { evaluatePermission } from './evaluate'
import { buildFolderTree } from '@/lib/archive/folderTree'

export type EffectiveFolderAccess = {
  folderId: number
  read: Awaited<ReturnType<typeof evaluatePermission>>
  write: Awaited<ReturnType<typeof evaluatePermission>>
  children: EffectiveFolderAccess[]
}

/** One evaluator-backed source for People and Folder-centered permission views. */
export async function resolveFolderAccessTree(args: { payload: Payload; domainId: number | string; actor: { userId: number | string; activeCharacterId?: number | string | null }; folders: Array<Record<string, unknown>> }): Promise<EffectiveFolderAccess[]> {
  const tree = buildFolderTree(args.folders as never)
  const visit = async (node: ReturnType<typeof buildFolderTree>[number]): Promise<EffectiveFolderAccess> => ({
    folderId: Number(node.folder.id),
    read: await evaluatePermission({ payload: args.payload, actor: args.actor, domainId: args.domainId, capability: 'read', resource: { type: 'Folder', id: node.folder.id } }),
    write: await evaluatePermission({ payload: args.payload, actor: args.actor, domainId: args.domainId, capability: 'edit_document', resource: { type: 'Folder', id: node.folder.id } }),
    children: await Promise.all(node.children.map(visit)),
  })
  return Promise.all(tree.map(visit))
}

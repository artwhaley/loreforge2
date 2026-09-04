import type { Payload } from 'payload'
import { evaluatePermission } from './evaluate'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { decideInSession, folderAncestry, type AuthzSession, type SessionDecision } from './session'

export type EffectiveFolderAccess = {
  folderId: number
  read: Awaited<ReturnType<typeof evaluatePermission>>
  write: Awaited<ReturnType<typeof evaluatePermission>>
  children: EffectiveFolderAccess[]
}

export async function resolveFolderPermission(args: { payload: Payload; domainId: number | string; actor: { userId: number | string; activeCharacterId?: number | string | null }; folderId: number | string }) {
  const [read, write] = await Promise.all([
    evaluatePermission({ payload: args.payload, actor: args.actor, domainId: args.domainId, capability: 'read', resource: { type: 'Folder', id: args.folderId } }),
    evaluatePermission({ payload: args.payload, actor: args.actor, domainId: args.domainId, capability: 'edit_document', resource: { type: 'Folder', id: args.folderId } }),
  ])
  return { read, write }
}

/**
 * P07P-02 session form: pure folder read/write decision, zero SQL. The
 * ancestry resolves in-memory from session facts.
 */
export function resolveFolderPermissionInSession(session: AuthzSession, folderId: number): { read: SessionDecision; write: SessionDecision } {
  const ancestry = folderAncestry(session, folderId)
  const target = { type: 'Folder' as const, id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }
  return { read: decideInSession(session, 'read', target), write: decideInSession(session, 'edit_document', target) }
}

/** One evaluator-backed source for People and Folder-centered permission views. */
export async function resolveFolderAccessTree(args: { payload: Payload; domainId: number | string; actor: { userId: number | string; activeCharacterId?: number | string | null }; folders: Array<Record<string, unknown>> }): Promise<EffectiveFolderAccess[]> {
  const tree = buildFolderTree(args.folders as never)
  const visit = async (node: ReturnType<typeof buildFolderTree>[number]): Promise<EffectiveFolderAccess> => ({
    folderId: Number(node.folder.id),
    ...(await resolveFolderPermission({ payload: args.payload, actor: args.actor, domainId: args.domainId, folderId: node.folder.id })),
    children: await Promise.all(node.children.map(visit)),
  })
  return Promise.all(tree.map(visit))
}

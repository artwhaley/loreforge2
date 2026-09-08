import type { Character, Domain, Tenant, User } from '@/payload-types'

import { buildFolderTree } from '@/lib/archive/folderTree'
import type { FolderManagementNode, FolderManagementPageModel } from '@/lib/page-models/management/folders'
import { decideInSession, folderAncestry } from '@/lib/authz/session'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'
import { getLorePayload } from '@/lib/payload'

/**
 * Folder management Page Model builder (OBSIDIAN-T03). Request-scoped: one
 * cached authorization session drives admission and every per-node
 * `canManage` decision, mirroring the previous route exactly. Returns null
 * when the acting identity is not admitted (route maps that to notFound()).
 * Mutation authority stays in the guarded `/api/folders` endpoint.
 */
export async function buildFolderManagementPageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'>
  activeCharacter: Character | null
}): Promise<FolderManagementPageModel | null> {
  const { tenant, user, activeCharacter } = input
  const payload = await getLorePayload()
  const session = await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id)
  const domainAllowed = session.authority != null || decideInSession(session, 'manage_folders', { type: 'Domain', id: Number(tenant.id) }).allowed
  const folderAllowed = domainAllowed || [...session.folders.keys()].some((folderId) =>
    decideInSession(session, 'manage_folders', { type: 'Folder', id: folderId, folderChain: folderAncestry(session, folderId).chain, subdomainId: folderAncestry(session, folderId).subdomainId }).allowed)
  if (!folderAllowed) return null

  const folders = await payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 0, pagination: false, sort: 'name' })

  const toNode = (node: ReturnType<typeof buildFolderTree>[number]): FolderManagementNode => {
    const folderId = Number(node.folder.id)
    const ancestry = folderAncestry(session, folderId)
    return {
      canManage: decideInSession(session, 'manage_folders', { type: 'Folder', id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }).allowed,
      id: folderId,
      name: node.folder.name,
      createdAt: String(node.folder.createdAt ?? ''),
      systemManaged: Boolean(node.folder.systemManaged),
      children: node.children.map(toNode),
    }
  }

  return {
    baseUrl: `/domain/${tenant.slug}`,
    domainSlug: tenant.slug,
    domainId: Number(tenant.id),
    domainName: tenant.name,
    rootManageable: domainAllowed,
    nodes: buildFolderTree(folders.docs).map(toNode),
    status: null,
  }
}
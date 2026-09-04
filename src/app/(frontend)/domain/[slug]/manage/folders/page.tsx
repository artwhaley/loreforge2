import { notFound } from 'next/navigation'

import { FolderManager, type AdminFolderNode } from '@/components/folders/FolderManager'
import { TenantShell } from '@/components/theme/TenantShell'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import type { PermissionDecision } from '@/lib/authz/evaluate'
import { resolveFolderPermissionInSession } from '@/lib/authz/folderAccess'
import { decideInSession, folderAncestry } from '@/lib/authz/session'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function ManageFoldersPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  // P07P-02: one request-owned session replaces the per-folder evaluator
  // fan-out (admission + canManage + effective read/write per folder node,
  // each previously a full ~8-query evaluator load).
  const session = await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id)
  const domainAllowed = session.authority != null || decideInSession(session, 'manage_folders', { type: 'Domain', id: Number(tenant.id) }).allowed
  const folderAllowed = domainAllowed || [...session.folders.keys()].some((folderId) => decideInSession(session, 'manage_folders', { type: 'Folder', id: folderId, folderChain: folderAncestry(session, folderId).chain, subdomainId: folderAncestry(session, folderId).subdomainId }).allowed)
  if (!folderAllowed) notFound()
  const [folders, domains] = await Promise.all([
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 0, pagination: false, sort: 'name' }),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  const toNode = (node: ReturnType<typeof buildFolderTree>[number]): AdminFolderNode => {
    const folderId = Number(node.folder.id)
    const effective = resolveFolderPermissionInSession(session, folderId)
    const source = (decision: PermissionDecision) => decision.matchedRule ? `${decision.matchedRule.principalType} rule` : decision.reason.replace(/\.$/, '')
    const ancestry = folderAncestry(session, folderId)
    return {
      canManage: decideInSession(session, 'manage_folders', { type: 'Folder', id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }).allowed,
      id: folderId,
      name: node.folder.name,
      systemManaged: Boolean(node.folder.systemManaged),
      effectiveRead: { allowed: effective.read.allowed, source: source(effective.read) },
      effectiveWrite: { allowed: effective.write.allowed, source: source(effective.write) },
      children: node.children.map(toNode),
    }
  }
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
    <section>
      <p><a href={`/domain/${slug}`}>← Domain home</a></p>
      <h1>Folders</h1>
      <FolderManager domainSlug={slug} folders={buildFolderTree(folders.docs).map(toNode)} canManageRoot={domainAllowed} />
    </section>
  </TenantShell>
}

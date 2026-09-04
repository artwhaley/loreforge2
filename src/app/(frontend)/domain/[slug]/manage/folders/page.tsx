import { notFound } from 'next/navigation'

import { FolderManager, type AdminFolderNode } from '@/components/folders/FolderManager'
import { TenantShell } from '@/components/theme/TenantShell'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function ManageFoldersPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const actor = { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }
  const domainAllowed = await isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_folders', resource: { type: 'Domain', id: tenant.id } })
  const foldersForScope = domainAllowed ? { docs: [] } : await payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 2000 })
  const folderAllowed = domainAllowed || (await Promise.all(foldersForScope.docs.map((folder) => isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_folders', resource: { type: 'Folder', id: folder.id } })))).some(Boolean)
  if (!folderAllowed) notFound()
  const [folders, domains] = await Promise.all([
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 2000, sort: 'name' }),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  const toNode = (node: ReturnType<typeof buildFolderTree>[number]): AdminFolderNode => ({ id: Number(node.folder.id), name: node.folder.name, systemManaged: Boolean(node.folder.systemManaged), children: node.children.map(toNode) })
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
    <section>
      <p><a href={`/domain/${slug}`}>← Domain home</a></p>
      <h1>Folders</h1>
      <FolderManager domainSlug={slug} folders={buildFolderTree(folders.docs).map(toNode)} />
    </section>
  </TenantShell>
}

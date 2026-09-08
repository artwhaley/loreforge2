import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildFolderManagementPageModel } from '@/lib/archive/buildFolderManagementPageModel'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

/**
 * Folder management (OBSIDIAN-T08). Thin route: the authorized
 * `FolderManagementPageModel` builder owns admission + projection; the body
 * dispatches through the selected Design's `management.folders` slot (no
 * per-Design branching in the route).
 */
export default async function ManageFoldersPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildFolderManagementPageModel({ tenant, user, activeCharacter }),
  ])
  if (!model) notFound()
  const Shell = route.design.Shell
  const Folders = route.design.pages.management.folders
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Folders {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
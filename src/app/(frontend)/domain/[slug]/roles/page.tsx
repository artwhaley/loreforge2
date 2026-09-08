import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildRoleManagementPageModel } from '@/lib/roles/buildRoleManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ roleId?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Role management (OBSIDIAN-T08). Thin route: the authorized builder owns
 * admission + projection; the body dispatches through the selected Design's
 * `management.roles` slot (no per-Design branching in the route).
 */
export default async function RolesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const requestedRoleIdRaw = Number(query?.roleId ?? '')
  const requestedRoleId = Number.isFinite(requestedRoleIdRaw) && requestedRoleIdRaw > 0 ? requestedRoleIdRaw : null
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildRoleManagementPageModel({ tenant, user, activeCharacter, requestedRoleId }),
  ])
  if (!model) notFound()
  const Shell = route.design.Shell
  const Roles = route.design.pages.management.roles
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Roles {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
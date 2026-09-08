import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildInvitationsManagementPageModel } from '@/lib/invitations/buildInvitationsManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ created?: string; error?: string; revoked?: string; decided?: string }> }

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

/**
 * Invitation management (OBSIDIAN-T08). Thin route: the authorized builder
 * owns admission and the semantic model; the body dispatches through the
 * selected Design's `management.invitations` slot (no per-Design branching in
 * the route).
 */
export default async function DomainInvitationsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildInvitationsManagementPageModel({ tenant, user, activeCharacterId: activeCharacter?.id ?? null, statusQuery: query }),
  ])
  if (!model.canManage) notFound()
  const Shell = route.design.Shell
  const Invitations = route.design.pages.management.invitations
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Invitations {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
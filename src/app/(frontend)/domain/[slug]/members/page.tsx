import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildMembersPageModel } from '@/lib/people/buildMembersPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ q?: string }> }

export const dynamic = 'force-dynamic'

/**
 * Public member directory (OBSIDIAN-T08). Thin route: the authorized builder
 * owns the projection (rows, Department participation, Role names, admin-only
 * search); the body dispatches through the selected Design's `members` slot
 * (no per-Design branching in the route).
 */
export default async function DomainMembersPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const q = String(query?.q ?? '').trim()
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter: null }),
    buildMembersPageModel({ tenant, role, user, search: q }),
  ])
  const Shell = route.design.Shell
  const Members = route.design.pages.members
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Members {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildPeopleManagementPageModel } from '@/lib/people/buildPeopleManagementPageModel'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

/**
 * People management (OBSIDIAN-T08). Thin route: the authorized builder owns
 * admission; the body dispatches through the selected Design's
 * `management.people` slot (no per-Design branching in the route).
 */
export default async function PeoplePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildPeopleManagementPageModel({ tenant, user, activeCharacter }),
  ])
  if (!model) notFound()
  const Shell = route.design.Shell
  const People = route.design.pages.management.people
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <People {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
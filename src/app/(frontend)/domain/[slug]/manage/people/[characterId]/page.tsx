import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildPersonManagementPageModel } from '@/lib/people/buildPersonManagementPageModel'

type Props = { params: Promise<{ slug: string; characterId: string }>; searchParams?: Promise<{ roleFilter?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Person workspace (OBSIDIAN-T08). Thin route: the authorized builder owns
 * admission and the full projection; the body dispatches through the selected
 * Design's `management.person` slot (no per-Design branching in the route).
 */
export default async function PersonWorkspacePage({ params, searchParams }: Props) {
  const { slug, characterId: rawCharacterId } = await params
  const characterId = Number(rawCharacterId)
  const query = await searchParams
  const roleFilter = query?.roleFilter === 'held' ? 'held' : 'assignable'
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildPersonManagementPageModel({ tenant, user, activeCharacter, characterId, roleFilter }),
  ])
  if (!model) notFound()
  const Shell = route.design.Shell
  const Person = route.design.pages.management.person
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Person {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
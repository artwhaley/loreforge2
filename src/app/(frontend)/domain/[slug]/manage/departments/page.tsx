import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildDepartmentsManagementPageModel } from '@/lib/departments/buildDepartmentsManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Department management (OBSIDIAN-T08). Thin route: the authorized builder
 * owns admission (P08-GATE-01 decision engine) and the semantic model; the
 * body dispatches through the selected Design's `management.departments` slot
 * (no per-Design branching in the route).
 */
export default async function ManageDepartmentsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildDepartmentsManagementPageModel({ tenant, user, activeCharacterId: activeCharacter?.id ?? null, statusQuery: query }),
  ])
  if (!model.canCreate) notFound()
  const Shell = route.design.Shell
  const Departments = route.design.pages.management.departments
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Departments {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
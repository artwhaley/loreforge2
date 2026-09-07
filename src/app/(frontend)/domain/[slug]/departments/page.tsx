import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildDepartmentsPageModel } from '@/lib/departments/buildDepartmentPageModels'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function DepartmentsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const [route, departments] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildDepartmentsPageModel({ tenant, role }),
  ])
  const Shell = route.design.Shell
  const Departments = route.design.pages.departments
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }}>
      <Departments {...departments} headerLayout={route.headerLayout} documentStyle={route.documentStyle} />
    </Shell>
  )
}

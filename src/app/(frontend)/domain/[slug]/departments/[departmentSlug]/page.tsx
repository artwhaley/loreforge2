import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildDepartmentPageModel } from '@/lib/departments/buildDepartmentPageModels'

type Props = { params: Promise<{ slug: string; departmentSlug: string }> }
export const dynamic = 'force-dynamic'

export default async function DepartmentPage({ params }: Props) {
  const { slug, departmentSlug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const [route, department] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildDepartmentPageModel({ tenant, role, departmentSlug }),
  ])
  if (!department) notFound()
  const Shell = route.design.Shell
  const Department = route.design.pages.department
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Department {...department} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}

import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildAboutPageModel } from '@/lib/departments/buildDepartmentPageModels'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AboutPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const [route, about] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildAboutPageModel({ tenant, user }),
  ])
  const Shell = route.design.Shell
  const About = route.design.pages.about
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <About {...about} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}

import { notFound } from 'next/navigation'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildHomePageModel } from '@/lib/home/buildHomePageModel'

export const dynamic = 'force-dynamic'
export default async function TenantHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || !user || tenant.slug !== slug) notFound()
  const [route, home] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildHomePageModel({ tenant, user, activeCharacter }),
  ])
  const Shell = route.design.Shell
  const Home = route.design.pages.home
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Home {...home} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}

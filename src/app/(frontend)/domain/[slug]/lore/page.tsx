import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildLorePageModel } from '@/lib/departments/buildDepartmentPageModels'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function LorePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const [route, lore] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildLorePageModel({ tenant }),
  ])
  const Shell = route.design.Shell
  const Lore = route.design.pages.lore
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }}>
      <Lore {...lore} headerLayout={route.headerLayout} documentStyle={route.documentStyle} />
    </Shell>
  )
}

import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { getLorePayload } from '@/lib/payload'
import { buildWorkPageModel } from '@/lib/work/buildWorkPageModel'
import { approveWorkItem, rejectWorkItem } from '@/lib/actions/workflowBridges'

export const dynamic = 'force-dynamic'

/**
 * Domain Work (OBSIDIAN-T08). Thin route: the builder adapts
 * `projectDomainWork()` (authorization filtering stays in the projection);
 * the real approve/reject server actions cross as bridges so the selected
 * Design's `work` slot never imports the workflow module itself. No
 * per-Design branching in the route.
 */
export default async function DomainWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildWorkPageModel({ payload, userId: user.id, activeCharacterId: activeCharacter?.id ?? null, tenantId: tenant.id, domainSlug: slug, domainName: tenant.name }),
  ])
  if (!model.authorized) notFound()
  const Shell = route.design.Shell
  const Work = route.design.pages.work
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <Work {...model} approveAction={approveWorkItem} rejectAction={rejectWorkItem} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
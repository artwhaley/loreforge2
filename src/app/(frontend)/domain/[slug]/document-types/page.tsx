import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildDocumentTypesManagementPageModel } from '@/lib/documents/buildDocumentTypesManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Document Types management (OBSIDIAN-T08). Thin route: the authorized
 * builder wraps the P08X resolvers; the body dispatches through the selected
 * Design's `management.documentTypes` slot (no per-Design branching in the
 * route).
 */
export default async function DocumentTypesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [route, model] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildDocumentTypesManagementPageModel({ tenant, user, activeCharacter }),
  ])
  const Shell = route.design.Shell
  const DocumentTypes = route.design.pages.management.documentTypes
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <DocumentTypes {...model} headerLayout={route.headerLayout} documentStyle={route.documentStyle} designConfig={route.config as object} />
    </Shell>
  )
}
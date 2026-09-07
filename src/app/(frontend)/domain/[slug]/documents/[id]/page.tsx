import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildDocumentPageModel } from '@/lib/document/buildDocumentPageModel'
import { documentWorkflowAction, softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'

type Props = {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ source?: string; error?: string }>
}

export const dynamic = 'force-dynamic'

export default async function DocumentViewPage({ params, searchParams }: Props) {
  const { slug, id } = await params
  const { source, error: errorCode } = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) notFound()

  const [route, document] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildDocumentPageModel({ tenant, user, activeCharacter, documentId: id, source, errorCode }),
  ])
  if (!document) notFound()
  const Shell = route.design.Shell
  const Document = route.design.pages.document
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }}>
      <Document
        {...document}
        workflowAction={documentWorkflowAction}
        deleteAction={softDeleteDocumentAction}
        headerLayout={route.headerLayout}
        documentStyle={route.documentStyle}
      />
    </Shell>
  )
}

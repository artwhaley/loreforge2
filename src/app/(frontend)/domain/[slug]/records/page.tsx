import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { buildRecordsPageModel } from '@/lib/records/buildRecordsPageModel'
import { RecordActionsProvider } from '@/components/functional/records/recordActions'
import { softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ folder?: string; q?: string }>
}

export const dynamic = 'force-dynamic'

export default async function RecordsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { folder: folderRaw, q } = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()

  const [route, records] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    buildRecordsPageModel({ tenant, user, activeCharacter, folderRaw, searchRaw: q }),
  ])
  const Shell = route.design.Shell
  const Records = route.design.pages.records
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      <RecordActionsProvider deleteAction={softDeleteDocumentAction}>
        <Records {...records} designConfig={route.config as object} />
      </RecordActionsProvider>
    </Shell>
  )
}

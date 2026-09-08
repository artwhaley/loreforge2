import { notFound } from 'next/navigation'

import { FolderManager } from '@/components/folders/FolderManager'
import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { buildFolderManagementPageModel } from '@/lib/archive/buildFolderManagementPageModel'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

/**
 * Folder management (OBSIDIAN-T03). The route is thin: the authorized
 * `FolderManagementPageModel` builder owns admission + projection, and the
 * shared workspace owns the interactive state machine. The page body renders
 * inside the selected Design's Shell via the design-aware TenantShell
 * wrapper; T08 moves the body behind a Design-owned entrypoint.
 */
export default async function ManageFoldersPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const model = await buildFolderManagementPageModel({ tenant, user, activeCharacter })
  if (!model) notFound()
  const domains = await getTenantsForUser(user.id)
  return (
    <TenantShell tenant={tenant} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>Folders</h1>
        <FolderManager model={model} />
      </section>
    </TenantShell>
  )
}
import { notFound } from 'next/navigation'

import { RoleManager } from '@/components/roles/RoleManager'
import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { buildRoleManagementPageModel } from '@/lib/roles/buildRoleManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ roleId?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Role management (OBSIDIAN-T04). Thin route: the authorized builder owns
 * admission + projection; the shared workspace owns selection/search/dialogs
 * and the guarded mutation transports. Body renders inside the selected
 * Design's Shell via the design-aware TenantShell; T08 moves it behind a
 * Design-owned entrypoint.
 */
export default async function RolesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const requestedRoleIdRaw = Number(query?.roleId ?? '')
  const requestedRoleId = Number.isFinite(requestedRoleIdRaw) && requestedRoleIdRaw > 0 ? requestedRoleIdRaw : null
  const model = await buildRoleManagementPageModel({ tenant, user, activeCharacter, requestedRoleId })
  if (!model) notFound()
  const domains = await getTenantsForUser(user.id)
  return (
    <TenantShell tenant={tenant} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>Roles</h1>
        <RoleManager model={model} />
      </section>
    </TenantShell>
  )
}
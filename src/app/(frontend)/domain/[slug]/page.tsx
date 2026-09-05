import { notFound } from 'next/navigation'
import { TenantShell } from '@/components/theme/TenantShell'
import { DomainHome } from '@/components/theme/DomainHome'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { loadDomainHome } from '@/lib/theme/home'

export const dynamic = 'force-dynamic'
export default async function TenantHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || !user || tenant.slug !== slug) notFound()
  const [myTenants, { home }] = await Promise.all([getTenantsForUser(user.id), loadDomainHome(tenant, user, activeCharacter)])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={myTenants}>
    <DomainHome {...home} />
  </TenantShell>
}

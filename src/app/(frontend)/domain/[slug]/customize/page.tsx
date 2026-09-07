import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { ThemeStudio } from '@/components/theme/ThemeStudio'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { mediaSrc } from '@/lib/theme/fonts'
import { getLorePayload } from '@/lib/payload'
import { isAllowed } from '@/lib/authz/evaluate'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function CustomizePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }
  if (!user) {
    redirect('/admin/login')
  }
  const payload = await getLorePayload()
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) notFound()

  const myTenants = await getTenantsForUser(user.id)

  return (
    <TenantShell
      tenant={tenant}
      role={role}
      switcherTenants={myTenants}
    >
      <ThemeStudio
        tenantSlug={tenant.slug}
        domainName={tenant.name}
        motto={tenant.motto ?? ''}
        initial={{
          preset: tenant.preset,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          accentColor: tenant.accentColor,
          backgroundColor: tenant.backgroundColor,
          headingFontKey: tenant.headingFontKey,
          bodyFontKey: tenant.bodyFontKey,
          designTemplate: tenant.designTemplate ?? 'civic',
          contentWidth: tenant.contentWidth ?? 'standard',
          headerLayout: tenant.headerLayout ?? 'centered',
          documentStyle: tenant.documentStyle ?? 'classic',
          backgroundTreatment: tenant.backgroundTreatment ?? 'plain',
          backgroundImageSet: Boolean(tenant.backgroundImage),
        }}
        logoUrl={mediaSrc(tenant.logo)}
        bannerUrl={mediaSrc(tenant.banner)}
        backgroundUrl={mediaSrc(tenant.backgroundImage)}
      />
    </TenantShell>
  )
}

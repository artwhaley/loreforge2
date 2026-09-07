import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { ThemeStudio } from '@/components/theme/ThemeStudio'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { mediaSrc } from '@/lib/theme/fonts'
import { getLorePayload } from '@/lib/payload'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveDomainDesign } from '@/lib/design/resolveDomainDesign'
import type { LegacyDomainAppearance } from '@/lib/design/contracts'

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

  // P08D-T04-C: the Studio bootstraps from the SAME canonical resolver as the
  // live routes — never from raw scalar fields. The legacy ThemeState shape is
  // projected from the resolved config below; T05 replaces this surface with
  // the Design-owned Studio editors.
  const resolved = resolveDomainDesign(tenant as unknown as LegacyDomainAppearance)
  const resolvedConfig = resolved.config as { typography?: { headingFontKey?: string; bodyFontKey?: string; displayFontKey?: string }; layout?: { width?: string }; background?: { treatment?: string } }
  const initial = {
    preset: tenant.preset,
    primaryColor: resolved.theme.base.primary,
    secondaryColor: resolved.theme.base.secondary,
    accentColor: resolved.theme.base.accent,
    backgroundColor: resolved.theme.base.pageBg,
    headingFontKey: resolvedConfig.typography?.headingFontKey ?? resolvedConfig.typography?.displayFontKey ?? tenant.headingFontKey ?? 'verdana',
    bodyFontKey: resolvedConfig.typography?.bodyFontKey ?? tenant.bodyFontKey ?? 'verdana',
    designTemplate: resolved.design.key,
    contentWidth: resolvedConfig.layout?.width ?? tenant.contentWidth ?? 'standard',
    headerLayout: resolved.variant.headerLayout,
    documentStyle: resolved.variant.documentStyle,
    backgroundTreatment: resolvedConfig.background?.treatment ?? tenant.backgroundTreatment ?? 'plain',
    backgroundImageSet: Boolean(tenant.backgroundImage),
  }

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
        initial={initial}
        logoUrl={mediaSrc(tenant.logo)}
        bannerUrl={mediaSrc(tenant.banner)}
        backgroundUrl={mediaSrc(tenant.backgroundImage)}
      />
    </TenantShell>
  )
}

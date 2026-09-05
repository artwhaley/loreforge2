import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { ThemeStudio } from '@/components/theme/ThemeStudio'
import { loadDomainHome } from '@/lib/theme/home'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { mediaSrc, resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
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
  const tokens = resolveThemeTokens(tenant)

  // Representative document for the preview: prefer the fixture report.
  const { home, documents: docs } = await loadDomainHome(tenant, user, activeCharacter)
  const previewDoc = docs.find((d) => d.title === 'Incident Report 2026-014') ?? docs[0]

  const previewHtml = previewDoc
    ? renderMarkdown(previewDoc.body)
    : '<p>No record yet.</p>'
  const previewMeta = previewDoc
    ? `Filed ${new Date(previewDoc.createdAt as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : ''

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
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
        home={home}
        previewHtml={previewHtml}
        previewDocTitle={previewDoc?.title ?? ''}
        previewMeta={previewMeta}
      />
    </TenantShell>
  )
}

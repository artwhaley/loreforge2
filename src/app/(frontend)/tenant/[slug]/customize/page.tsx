import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { ThemeStudio } from '@/components/theme/ThemeStudio'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getDocumentsForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { mediaSrc, resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function CustomizePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }
  if (!user) {
    redirect('/admin/login')
  }
  if (role !== 'admin') {
    notFound()
  }

  const myTenants = await getTenantsForUser(user.id)
  const tokens = resolveThemeTokens(tenant)

  // Representative document for the preview: prefer the fixture report.
  const docs = await getDocumentsForTenant(tenant)
  const previewDoc = docs.find((d) => d.title === 'Incident Report 2026-014') ?? docs[0]

  const previewHtml = previewDoc
    ? renderMarkdown(previewDoc.body)
    : '<p>No record yet.</p>'
  const previewMeta = previewDoc
    ? `Filed ${new Date(previewDoc.createdAt as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${previewDoc.origin.replace('-', ' ')}`
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
        cityName={tenant.name}
        motto={tenant.motto ?? ''}
        initial={{
          preset: tenant.preset,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          accentColor: tenant.accentColor,
          backgroundColor: tenant.backgroundColor,
          headingFontKey: tenant.headingFontKey,
          bodyFontKey: tenant.bodyFontKey,
        }}
        logoUrl={mediaSrc(tenant.logo)}
        bannerUrl={mediaSrc(tenant.banner)}
        previewHtml={previewHtml}
        previewDocTitle={previewDoc?.title ?? ''}
        previewMeta={previewMeta}
      />
    </TenantShell>
  )
}

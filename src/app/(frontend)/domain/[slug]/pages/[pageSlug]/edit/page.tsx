import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getPageForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = {
  params: Promise<{ slug: string; pageSlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function PageEditPage({ params }: Props) {
  const { slug, pageSlug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }
  if (!user) {
    redirect('/admin/login')
  }

  const page = await getPageForTenant(tenant, pageSlug)
  if (!page) {
    notFound()
  }

  const myTenants = await getTenantsForUser(user.id)
  const tokens = resolveThemeTokens(tenant)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <DocumentEditor
        entityId={page.id}
        entityType="page"
        tenantSlug={tenant.slug}
        initialTitle={page.title}
        initialMarkdown={page.body}
      />
    </TenantShell>
  )
}

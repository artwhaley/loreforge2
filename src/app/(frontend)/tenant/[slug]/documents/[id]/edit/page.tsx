import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = {
  params: Promise<{ slug: string; id: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditDocumentPage({ params }: Props) {
  const { slug, id } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }
  if (!user) {
    redirect(`/admin/login`)
  }

  const doc = await getDocumentForTenant(tenant, id)
  if (!doc) {
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
        documentId={doc.id}
        tenantSlug={tenant.slug}
        initialTitle={doc.title}
        initialMarkdown={doc.body}
      />
    </TenantShell>
  )
}

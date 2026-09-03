import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
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
  const editable = canEditDocumentBody(doc.lifecycle)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section>
        <p><a href={`/domain/${tenant.slug}/records`}>Records</a> / <a href={`/domain/${tenant.slug}/documents/${doc.id}`}>{doc.title}</a> / Edit</p>
        {!editable ? <p role="status">This record is <strong>{doc.lifecycle.replace('_', ' ')}</strong> and is read-only. A Domain administrator can return it to an editable state.</p> : null}
        <DocumentEditor
          entityId={doc.id}
          entityType="document"
          tenantSlug={tenant.slug}
          initialTitle={doc.title}
          initialMarkdown={doc.body}
          readOnly={!editable}
        />
      </section>
    </TenantShell>
  )
}

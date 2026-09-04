import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { getDocumentCharacterLinks } from '@/lib/documents/links'
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

  const [myTenants, payload] = await Promise.all([
    getTenantsForUser(user.id),
    (await import('@/lib/payload')).getLorePayload(),
  ])
  const characterLinks = await getDocumentCharacterLinks(payload, doc.id)
  const preparedBy = characterLinks.docs.find((link) => link.kind === 'prepared_by')?.character
  const preparedByLabel = preparedBy && typeof preparedBy === 'object' ? preparedBy.name : 'No Character credit'
  const concerns = characterLinks.docs
    .filter((link) => link.kind === 'concerns')
    .flatMap((link) => {
      if (!link.character || typeof link.character !== 'object') return []
      return [{
        id: Number(link.id),
        characterId: Number(link.character.id),
        name: link.character.name,
        relationshipLabel: link.relationshipLabel ?? '',
      }]
    })
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
          preparedByLabel={preparedByLabel}
          dateLabel={new Date(doc.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          concerns={concerns}
          canManageConcerns={role === 'admin' && editable}
        />
      </section>
    </TenantShell>
  )
}

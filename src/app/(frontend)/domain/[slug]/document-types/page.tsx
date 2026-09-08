import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DocumentTypesBrowser } from '@/components/documentTypes/DocumentTypesBrowser'
import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { buildDocumentTypesManagementPageModel } from '@/lib/documents/buildDocumentTypesManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Document Types management (OBSIDIAN-T05). Thin route: the authorized
 * builder wraps the P08X resolvers; the shared workspace owns selection.
 * Body renders inside the selected Design's Shell via the design-aware
 * TenantShell; T08 moves it behind a Design-owned entrypoint.
 */
export default async function DocumentTypesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const model = await buildDocumentTypesManagementPageModel({ tenant, user, activeCharacter })
  const domains = await getTenantsForUser(user.id)
  return (
    <TenantShell tenant={tenant} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
      <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.2rem' }}>
        <nav aria-label="Document Types"><Link href={`/domain/${slug}/document-types`} aria-current="page" title="Document Types are the first-order item; Templates and Forms hang off them">Document Types</Link> · <Link href={`/domain/${slug}/templates`} title="Standalone Markdown templates">Templates</Link> · <Link href={`/domain/${slug}/forms`} title="Standalone form templates">Forms</Link></nav>
        <div><h1>Document Types</h1><p>Document Types are the first-order item, organized by Department. Templates and Forms hang off each Type.</p></div>
        {query?.error ? <p role="alert">That Type change could not be saved.</p> : null}
        <DocumentTypesBrowser model={model} />
      </section>
    </TenantShell>
  )
}
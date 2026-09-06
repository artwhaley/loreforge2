import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DocumentTypesBrowser } from '@/components/documentTypes/DocumentTypesBrowser'
import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveInspectorData, resolveTypeTree } from '@/lib/documents/typeTree'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }

export const dynamic = 'force-dynamic'

export default async function DocumentTypesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  // P08X-T03: the tree resolver loads departments (active + archived for the
  // Unassigned derivation), type-folders, types, and their child templates.
  const tree = await resolveTypeTree(payload, tenant.id)
  // P08X-T04: the inspector needs every Domain role, the Folder tree for the
  // stage-folder popup, and the lifecycle-stages rows for the selected Type.
  const [inspector, domains, canManage] = await Promise.all([
    resolveInspectorData(payload, tenant.id, tree.types.map((type) => type.id)),
    getTenantsForUser(user.id),
    isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_types_tags', resource: { type: 'Domain', id: tenant.id } }),
  ])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.2rem' }}>
      <nav aria-label="Document Types"><Link href={`/domain/${slug}/document-types`} aria-current="page" title="Document Types are the first-order item; Templates and Forms hang off them">Document Types</Link> · <Link href={`/domain/${slug}/templates`} title="Standalone Markdown templates">Templates</Link> · <Link href={`/domain/${slug}/forms`} title="Standalone form templates">Forms</Link></nav>
      <div><h1>Document Types</h1><p>Document Types are the first-order item, organized by Department. Templates and Forms hang off each Type.</p></div>
      {query?.error ? <p role="alert">That Type change could not be saved.</p> : null}
      <DocumentTypesBrowser domainSlug={slug} data={tree} canManage={canManage} roles={inspector.roles} folders={inspector.folders} stagesByType={inspector.stagesByType} />
    </section>
  </TenantShell>
}
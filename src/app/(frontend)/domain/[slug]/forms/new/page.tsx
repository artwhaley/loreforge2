import { notFound } from 'next/navigation'

import { FormStudio } from '@/components/forms/FormStudio'
import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'

export const dynamic = 'force-dynamic'

export default async function NewFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_templates', resource: { type: 'Domain', id: tenant.id } })) notFound()
  const [folders, types, domains, baseTemplates] = await Promise.all([
    getFoldersForTenant(tenant),
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/forms`}>Forms</a> / New form</p><h1>New form</h1><p>Build a form that produces an ordinary archive document.</p><FormStudio mode="create" domainSlug={slug} folders={flatFolders.map(({ folder }) => ({ id: Number(folder.id), name: folder.name, parentId: typeof folder.parent === 'object' && folder.parent ? Number(folder.parent.id) : folder.parent == null ? null : Number(folder.parent) }))} types={types.docs.map((type) => ({ id: Number(type.id), name: type.name }))} baseTemplates={baseTemplates.docs.map((template) => ({ id: Number(template.id), name: template.name, scopeFolderId: Number(typeof template.scopeFolder === 'object' ? template.scopeFolder.id : template.scopeFolder), availableToDescendants: Boolean(template.availableToDescendants) }))} /></section>
  </TenantShell>
}

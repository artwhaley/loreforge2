import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { DocumentTemplateForm } from '@/components/templates/DocumentTemplateForm'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string; templateId: string }> }

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export default async function EditDocumentTemplatePage({ params }: Props) {
  const { slug, templateId: templateIdRaw } = await params
  const templateId = Number(templateIdRaw)
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user || !templateId) notFound()
  const payload = await getLorePayload()
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_templates', resource: { type: 'Domain', id: tenant.id } })) notFound()
  const found = await payload.find({ collection: 'templates', where: { and: [{ id: { equals: templateId } }, { domain: { equals: tenant.id } }, { kind: { equals: 'document' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const template = found.docs[0]
  if (!template) notFound()
  const [folders, types, domains, baseTemplates] = await Promise.all([
    getFoldersForTenant(tenant),
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/document-types`} title="Back to Document Types">Document Types</a> / Edit template</p><h1>{String(template.name ?? '')}</h1><p>Saving produces the next version of this template.</p><DocumentTemplateForm
      mode="edit"
      templateId={Number(template.id)}
      domainSlug={slug}
      folders={flatFolders.map(({ folder }) => ({ id: Number(folder.id), name: folder.name }))}
      types={types.docs.map((type) => ({ id: Number(type.id), name: type.name }))}
      baseTemplates={baseTemplates.docs.filter((candidate) => Number(candidate.id) !== Number(template.id)).map((candidate) => ({ id: Number(candidate.id), name: candidate.name }))}
      initial={{
        name: String(template.name ?? ''),
        documentTypeId: relationId(template.documentType) ?? '',
        scopeFolderId: relationId(template.scopeFolder) ?? '',
        baseTemplateId: relationId(template.baseTemplate) ?? '',
        titleTemplate: String(template.titleTemplate ?? ''),
        bodyTemplate: String(template.bodyTemplate ?? ''),
      }}
    /></section>
  </TenantShell>
}

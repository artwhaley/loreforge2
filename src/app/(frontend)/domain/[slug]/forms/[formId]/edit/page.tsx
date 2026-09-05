import { notFound } from 'next/navigation'

import { FormStudio, type StudioFormInitial } from '@/components/forms/FormStudio'
import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { assertFormSchema } from '@/lib/forms/schema'
import { recordNameKeyFromTitle } from '@/lib/forms/layout'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string; formId: string }> }

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export default async function EditFormPage({ params }: Props) {
  const { slug, formId: formIdRaw } = await params
  const formId = Number(formIdRaw)
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user || !formId) notFound()
  const payload = await getLorePayload()
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_templates', resource: { type: 'Domain', id: tenant.id } })) notFound()
  const formResult = await payload.find({ collection: 'templates', where: { and: [{ id: { equals: formId } }, { domain: { equals: tenant.id } }, { kind: { equals: 'form' } }] }, depth: 1, limit: 1, overrideAccess: true })
  const form = formResult.docs[0]
  if (!form) notFound()

  let fields: StudioFormInitial['fields']
  try { fields = assertFormSchema(form.formSchema).fields } catch { notFound() }
  const recordNameKey = recordNameKeyFromTitle(String(form.titleTemplate ?? ''), fields)

  const [folders, types, domains, baseTemplates] = await Promise.all([
    getFoldersForTenant(tenant),
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const initial: StudioFormInitial = {
    name: String(form.name ?? ''),
    documentTypeId: relationId(form.documentType) ?? '',
    scopeFolderId: relationId(form.scopeFolder) ?? '',
    destinationFolderId: relationId(form.destinationFolder) ?? '',
    baseTemplateId: relationId(form.baseTemplate) ?? '',
    recordNameKey,
    fields,
    headerMarkdown: form.headerMarkdown ?? '',
    footerMarkdown: form.footerMarkdown ?? '',
  }
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1400, margin: '0 auto' }}><p><a href={`/domain/${slug}/forms`}>Forms</a> / Edit form</p><h1>{initial.name}</h1><p>Saving updates the questions and produces the next version of this form.</p><FormStudio mode="edit" templateId={Number(form.id)} domainSlug={slug} folders={flatFolders.map(({ folder }) => ({ id: Number(folder.id), name: folder.name, parentId: typeof folder.parent === 'object' && folder.parent ? Number(folder.parent.id) : folder.parent == null ? null : Number(folder.parent) }))} types={types.docs.map((type) => ({ id: Number(type.id), name: type.name }))} baseTemplates={baseTemplates.docs.map((template) => ({ id: Number(template.id), name: template.name, scopeFolderId: relationId(template.scopeFolder) ?? 0, availableToDescendants: Boolean(template.availableToDescendants) }))} initial={initial} /></section>
  </TenantShell>
}

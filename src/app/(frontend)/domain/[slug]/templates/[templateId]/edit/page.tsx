import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { DocumentTemplateForm } from '@/components/templates/DocumentTemplateForm'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'

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
  const [types, domains, baseTemplates] = await Promise.all([
    payload.find({ collection: 'document-types', where: { and: [{ id: { equals: relationId(template.documentType) ?? 0 } }, { domain: { equals: tenant.id } }] }, depth: 0, limit: 1, overrideAccess: true }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const documentType = types.docs[0]
  if (!documentType) notFound()
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/document-types`} title="Back to Document Types">Document Types</a> / Edit template</p><DocumentTemplateForm
      mode="edit"
      templateId={Number(template.id)}
      domainSlug={slug}
      documentType={{ id: Number(documentType.id), name: String(documentType.name ?? '') }}
      baseTemplates={baseTemplates.docs.filter((candidate) => Number(candidate.id) !== Number(template.id)).map((candidate) => ({ id: Number(candidate.id), name: candidate.name }))}
      initial={{
        name: String(template.name ?? ''),
        baseTemplateId: relationId(template.baseTemplate) ?? '',
        bodyTemplate: String(template.bodyTemplate ?? ''),
      }}
    /></section>
  </TenantShell>
}

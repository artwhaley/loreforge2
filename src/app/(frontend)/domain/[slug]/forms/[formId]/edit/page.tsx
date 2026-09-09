import { notFound } from 'next/navigation'

import { FormStudio, type StudioFormInitial } from '@/components/forms/FormStudio'
import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'
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
  const formResult = await payload.find({ collection: 'templates', where: { and: [{ id: { equals: formId } }, { domain: { equals: tenant.id } }, { kind: { equals: 'form' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const form = formResult.docs[0]
  if (!form) notFound()

  let fields: StudioFormInitial['fields']
  try { fields = assertFormSchema(form.formSchema).fields } catch { notFound() }
  const recordNameKey = recordNameKeyFromTitle(String(form.titleTemplate ?? ''), fields)

  const typeId = relationId(form.documentType) ?? 0
  const [types, domains, baseTemplates] = await Promise.all([
    payload.find({ collection: 'document-types', where: { and: [{ id: { equals: typeId } }, { domain: { equals: tenant.id } }] }, depth: 0, limit: 1, overrideAccess: true }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const documentType = types.docs[0]
  if (!documentType) notFound()
  const initial: StudioFormInitial = {
    name: String(form.name ?? ''),
    baseTemplateId: relationId(form.baseTemplate) ?? '',
    recordNameKey,
    fields,
    headerMarkdown: form.headerMarkdown ?? '',
    footerMarkdown: form.footerMarkdown ?? '',
  }
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1400, margin: '0 auto' }}><p><a href={`/domain/${slug}/document-types`} title="Back to Document Types">Document Types</a> / Edit form</p><h1>{initial.name}</h1><FormStudio mode="edit" templateId={Number(form.id)} domainSlug={slug} documentType={{ id: Number(documentType.id), name: String(documentType.name ?? '') }} baseTemplates={baseTemplates.docs.map((template) => ({ id: Number(template.id), name: template.name }))} initial={initial} /></section>
  </TenantShell>
}

import { notFound } from 'next/navigation'

import { FormStudio } from '@/components/forms/FormStudio'
import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { isAllowed } from '@/lib/authz/evaluate'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ type?: string }> }

/**
 * Type-first authoring: this page is reached from the Document Types page
 * with the owning Type in the URL. The Type carries placement and
 * permissions, so it is fixed context here — not a choice.
 */
export default async function NewFormPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { type: typeRaw } = (await searchParams) ?? {}
  const typeId = Number(typeRaw)
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_templates', resource: { type: 'Domain', id: tenant.id } })) notFound()
  if (!typeId) notFound()
  const [types, domains, baseTemplates] = await Promise.all([
    payload.find({ collection: 'document-types', where: { and: [{ id: { equals: typeId } }, { domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 1, sort: 'name' }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const documentType = types.docs[0]
  if (!documentType) notFound()
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/document-types`} title="Back to Document Types">Document Types</a> / New form</p><h1>New form — {String(documentType.name ?? '')}</h1><p>Build a form that produces an ordinary archive document. Availability and routing come from the Type.</p><FormStudio mode="create" domainSlug={slug} documentType={{ id: Number(documentType.id), name: String(documentType.name ?? '') }} baseTemplates={baseTemplates.docs.map((template) => ({ id: Number(template.id), name: template.name }))} /></section>
  </TenantShell>
}

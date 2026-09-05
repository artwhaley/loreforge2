import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { effectiveCreationMethods } from '@/lib/documents/creation'

export const dynamic = 'force-dynamic'

export default async function DocumentTypesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const [types, templates, domains] = await Promise.all([
    payload.find({ collection: 'document-types', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 500, overrideAccess: true }),
    getTenantsForUser(user.id),
  ])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><nav aria-label="Templates and Forms"><Link href={`/domain/${slug}/forms`}>Forms</Link> · <Link href={`/domain/${slug}/templates`}>Templates</Link> · <Link href={`/domain/${slug}/document-types`} aria-current="page">Document Types</Link></nav><h1>Document Types</h1><p>Creation methods are configured on each Type. Template and Form methods become available only when an active child is attached.</p><ul>{types.docs.map((type) => { const children = templates.docs.filter((template) => { const typeId = typeof template.documentType === 'object' ? template.documentType.id : template.documentType; return Number(typeId) === Number(type.id) }); const methods = effectiveCreationMethods(type, children); return <li key={type.id}>{type.name} · {type.active ? 'Active' : 'Inactive'} · {methods.length > 0 ? methods.map((method) => method === 'blank' ? 'Blank' : method === 'template' ? 'Template' : 'Form').join(', ') : 'No effective creation methods'}</li> })}</ul></section>
  </TenantShell>
}

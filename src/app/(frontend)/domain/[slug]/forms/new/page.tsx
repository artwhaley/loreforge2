import { notFound } from 'next/navigation'

import { FormStudio } from '@/components/forms/FormStudio'
import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

export const dynamic = 'force-dynamic'

export default async function NewFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user || role !== 'admin') notFound()
  const payload = await getLorePayload()
  const [folders, types, domains, baseTemplates] = await Promise.all([
    getFoldersForTenant(tenant),
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' }),
    getTenantsForUser(user.id),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/forms`}>Forms</a> / New form</p><h1>New form</h1><p>Build a form that produces an ordinary archive document.</p><FormStudio domainSlug={slug} folders={folders.map((folder) => ({ id: Number(folder.id), name: folder.name }))} types={types.docs.map((type) => ({ id: Number(type.id), name: type.name }))} baseTemplates={baseTemplates.docs.map((template) => ({ id: Number(template.id), name: template.name }))} /></section>
  </TenantShell>
}

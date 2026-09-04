import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

export const dynamic = 'force-dynamic'

export default async function DocumentTypesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const [types, domains] = await Promise.all([
    payload.find({ collection: 'document-types', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
    getTenantsForUser(user.id),
  ])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><nav aria-label="Templates and Forms"><Link href={`/domain/${slug}/forms`}>Forms</Link> · <Link href={`/domain/${slug}/templates`}>Templates</Link> · <Link href={`/domain/${slug}/document-types`} aria-current="page">Document Types</Link></nav><h1>Document Types</h1><ul>{types.docs.map((type) => <li key={type.id}>{type.name} · {type.active ? 'Active' : 'Inactive'}</li>)}</ul></section>
  </TenantShell>
}


import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getSubdomainsForDomain } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function ManageDepartmentsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || role !== 'admin') notFound()
  const [departments, domains] = await Promise.all([getSubdomainsForDomain(tenant.id), user ? getTenantsForUser(user.id) : Promise.resolve([])])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}><section><p><a href={`/domain/${slug}/departments`}>{vocab.subdomain.plural}</a> / Manage</p><h1>Manage {vocab.subdomain.plural}</h1><p>Create and order the working groups in this Domain. {vocab.subdomain.singular} membership and {vocab.role.singular} assignments remain managed from each person’s workspace.</p><h2>New {vocab.subdomain.singular}</h2><form action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input name="name" placeholder={`${vocab.subdomain.singular} name`} required /><input name="slug" placeholder="url-slug" required /><input name="description" placeholder="Description" /><input name="sortOrder" type="number" defaultValue="0" /><button type="submit">Create {vocab.subdomain.singular}</button></form><h2>Existing {vocab.subdomain.plural}</h2><ul>{departments.map((department) => <li key={department.id}><strong>{department.name}</strong> <a href={`/domain/${slug}/departments/${department.slug}`}>Open</a> · order {department.sortOrder ?? 0} {department.publicListing ? '' : '(hidden)'}<form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="archive" /><button type="submit">Archive</button></form></li>)}</ul></section></TenantShell>
}

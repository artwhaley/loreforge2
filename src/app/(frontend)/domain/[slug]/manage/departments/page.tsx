import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getSubdomainsForDomain } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }
export const dynamic = 'force-dynamic'

const DEPARTMENT_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'You are not authorized to manage Departments with the selected acting Character.',
  invalid: 'That Department name or slug is invalid.',
  duplicate: 'A Department with that slug already exists.',
  failed: 'That Department action could not be completed.',
}

export default async function ManageDepartmentsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const { loadCachedAuthorizationSession } = await import('@/lib/authz/sessionCache')
  const { decideOne } = await import('@/lib/authz/session')
  const { getLorePayload } = await import('@/lib/payload')
  const payload = await getLorePayload()
  const session = user ? await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id) : null
  // P08-GATE-01: workspace admission from the decision engine, never role === 'admin'.
  const canManage = Boolean(session && (session.authority != null || decideOne(session, 'manage_subdomain', { type: 'Domain', id: Number(tenant.id) }).allowed))
  if (!canManage) notFound()
  const [departments, domains] = await Promise.all([getSubdomainsForDomain(tenant.id), user ? getTenantsForUser(user.id) : Promise.resolve([])])
  const deptError = query?.error && DEPARTMENT_ERROR_MESSAGES[query.error] ? DEPARTMENT_ERROR_MESSAGES[query.error] : null
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}><section><p><a href={`/domain/${slug}/departments`}>{vocab.subdomain.plural}</a> / Manage</p><h1>Manage {vocab.subdomain.plural}</h1>{deptError ? <p role="alert">{deptError}</p> : null}<p>Create and order the working groups in this Domain. {vocab.subdomain.singular} membership and {vocab.role.singular} assignments remain managed from each person’s workspace.</p><h2>New {vocab.subdomain.singular}</h2><form action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input name="name" placeholder={`${vocab.subdomain.singular} name`} required /><input name="slug" placeholder="url-slug" required /><input name="description" placeholder="Description" /><input name="sortOrder" type="number" defaultValue="0" /><button type="submit">Create {vocab.subdomain.singular}</button></form><h2>Existing {vocab.subdomain.plural}</h2><ul>{departments.map((department) => <li key={department.id}><strong>{department.name}</strong> <a href={`/domain/${slug}/departments/${department.slug}`}>Open</a> · order {department.sortOrder ?? 0} {department.publicListing ? '' : '(hidden)'}<form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="archive" /><button type="submit">Archive</button></form></li>)}</ul></section></TenantShell>
}

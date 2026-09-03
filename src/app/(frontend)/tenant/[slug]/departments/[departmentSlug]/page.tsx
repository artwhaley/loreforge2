import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getSubdomainBySlug, getSubdomainMemberships } from '@/lib/domains/queries'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string; departmentSlug: string }> }
export const dynamic = 'force-dynamic'

export default async function DepartmentPage({ params }: Props) {
  const { slug, departmentSlug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const department = await getSubdomainBySlug(tenant.id, departmentSlug)
  if (!department) notFound()
  const [memberships, folders, domains] = await Promise.all([getSubdomainMemberships(department.id), getFoldersForTenant(tenant), user ? getTenantsForUser(user.id) : Promise.resolve([])])
  const departmentFolders = folders.filter((folder) => Number(typeof folder.subdomain === 'object' ? folder.subdomain?.id : folder.subdomain) === Number(department.id))
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
    <p><a href={`/domain/${slug}/departments`}>Departments</a> / {department.name}</p>
    <section><h1>{department.name}</h1><p>{department.description || 'A Department within this Domain.'}</p><h2>Overview</h2><p>Department records, templates, and activity will appear here as those capabilities are connected.</p><h2>Folders</h2>{departmentFolders.length ? <ul>{departmentFolders.map((folder) => <li key={folder.id}>{folder.name}</li>)}</ul> : <p>No folders are visible yet.</p>}<h2>Members</h2>{memberships.length ? <ul>{memberships.map((membership) => { const character = typeof membership.character === 'object' ? membership.character : null; return <li key={membership.id}>{character?.name ?? 'Unknown Character'}</li> })}</ul> : <p>No active members yet.</p>}{role === 'admin' ? <p><a href={`/domain/${slug}/manage/people`}>Manage Department people</a></p> : null}</section>
  </TenantShell>
}

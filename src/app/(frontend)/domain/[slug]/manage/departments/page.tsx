import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { buildDepartmentsManagementPageModel } from '@/lib/departments/buildDepartmentsManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Department management (OBSIDIAN-T07). Thin route: the authorized builder
 * owns admission (P08-GATE-01 decision engine) and the semantic model; the
 * body renders inside the selected Design's Shell via the design-aware
 * TenantShell. T08 moves it behind a Design-owned entrypoint.
 */
export default async function ManageDepartmentsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const model = await buildDepartmentsManagementPageModel({ tenant, user, activeCharacterId: activeCharacter?.id ?? null, statusQuery: query })
  if (!model.canCreate) notFound()
  const domains = user ? await getTenantsForUser(user.id) : []
  const vocab = model.vocabulary
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}><section><p><a href={`/domain/${slug}/departments`}>{vocab.subdomainPlural}</a> / Manage</p><h1>Manage {vocab.subdomainPlural}</h1>{model.status ? <p role="alert">{model.status.message}</p> : null}<p>Create the working groups in this Domain. {vocab.subdomainSingular} membership and {vocab.roleSingular} assignments remain managed from each person’s workspace.</p><h2>New {vocab.subdomainSingular}</h2><form action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><label>{vocab.subdomainSingular} name <input name="name" placeholder="e.g. Hall of Coin" required autoFocus /></label> <button type="submit">Create {vocab.subdomainSingular}</button></form><h2>Existing {vocab.subdomainPlural}</h2>{model.departments.length === 0 ? <p>No {vocab.subdomainPlural.toLowerCase()} yet.</p> : <ul>{model.departments.map((department) => <li key={department.id}><strong>{department.name}</strong> <code>/{department.slug}</code> <a href={`/domain/${slug}/departments/${department.slug}`}>Open</a>{department.archived ? ' (hidden)' : ''} {department.canArchive ? <form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="archive" /><button type="submit" title="Archive this Department — its Document Types move under Unassigned until it is restored">Archive</button></form> : department.canRestore ? <form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="restore" /><button type="submit" title="Restore this Department — its Document Types return from Unassigned to a normal root">Restore</button></form> : null}</li>)}</ul>}</section></TenantShell>
}
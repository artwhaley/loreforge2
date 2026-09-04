import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { getLorePayload } from '@/lib/payload'
import { isAllowed } from '@/lib/authz/evaluate'
import { canOpenPeople } from '@/lib/authz/workspaces'

import { PeopleSearch } from './PeopleSearch'
import styles from './people.module.scss'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function PeoplePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const allowed = await Promise.all(['manage_members', 'manage_roles', 'manage_access'].map((capability) => isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability, resource: { type: 'Domain', id: tenant.id } })))
  if (!allowed.some(Boolean) && !await canOpenPeople(payload, { userId: user.id, activeCharacterId: activeCharacter?.id }, tenant.id)) notFound()
  const domains = user ? await getTenantsForUser(user.id) : []
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
    <section className={styles.page}>
      <p className={styles.crumb}><a href={`/domain/${slug}`}>{tenant.name}</a> / People</p>
      <div className={styles.header}><div><h1>People</h1><p>Find a Character, then manage their Department Roles and Folder access in one workspace.</p></div><a href={`/domain/${slug}/departments`}>View Departments</a></div>
      <PeopleSearch domainSlug={slug} />
      <p className={styles.help}>Search results appear as you type. Choose a Character to open their workspace; Roles and Folder access are separate controls.</p>
    </section>
  </TenantShell>
}

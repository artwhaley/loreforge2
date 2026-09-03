import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import { PeopleSearch } from './PeopleSearch'
import styles from './people.module.scss'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function PeoplePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || role !== 'admin') notFound()
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

import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDepartmentParticipants, getSubdomainsForDomain } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './departments.module.scss'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function DepartmentsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const [departments, domains] = await Promise.all([getSubdomainsForDomain(tenant.id), user ? getTenantsForUser(user.id) : Promise.resolve([])])
  const memberCounts = new Map<number, number>()
  await Promise.all(departments.map(async (department) => { memberCounts.set(Number(department.id), (await getDepartmentParticipants(department.id)).length) }))
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
    <section><h1 className={styles.pageTitle}>Departments</h1><p className={styles.pageIntro}>The offices and working groups inside {tenant.name}. Choose a Department to see its people and archive branches.</p>
      {role === 'admin' ? <p><a className={styles.manageLink} href={`/domain/${slug}/manage/people`}>Manage People</a></p> : null}
      {departments.length === 0 ? <p className={styles.empty}>No Departments have been configured.</p> : <ul className={styles.grid}>{departments.map((department) => <li key={department.id} className={styles.card}><h2 className={styles.cardTitle}><a href={`/domain/${slug}/departments/${department.slug}`}>{department.name}</a></h2><p className={styles.cardDesc}>{department.description || 'A Department within this Domain.'}</p><p className={styles.cardMeta}>{memberCounts.get(Number(department.id)) ?? 0} active participant{memberCounts.get(Number(department.id)) === 1 ? '' : 's'}</p></li>)}</ul>}
    </section>
  </TenantShell>
}

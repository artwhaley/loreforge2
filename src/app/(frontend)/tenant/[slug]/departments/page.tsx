import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { getDepartmentsForTenant } from '@/lib/departments'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './departments.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function DepartmentsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const myTenants = user ? await getTenantsForUser(user.id) : []
  const departments = getDepartmentsForTenant(tenant.slug)
  const tokens = resolveThemeTokens(tenant)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section>
        <h1 className={styles.pageTitle}>Subdomains</h1>
        <p className={styles.pageIntro}>Offices and services of {tenant.name}.</p>

        {departments.length === 0 ? (
          <p className={styles.empty}>No subdomains listed.</p>
        ) : (
          <ul className={styles.grid}>
            {departments.map((dept) => (
              <li key={dept.name} className={styles.card}>
                <h2 className={styles.cardTitle}>{dept.name}</h2>
                <p className={styles.cardDesc}>{dept.description}</p>
                <span className={styles.cardPhone}>{dept.phone}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </TenantShell>
  )
}

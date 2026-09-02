import { notFound } from 'next/navigation'
import Link from 'next/link'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFormsForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './forms.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function FormsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const base = `/tenant/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const forms = await getFormsForTenant(tenant)
  const tokens = resolveThemeTokens(tenant)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section className={styles.panel}>
        <h1 className={styles.title}>Report forms</h1>
        <p className={styles.intro}>
          Fill a structured form to generate a normal archive record, filed automatically in its
          destination folder.
        </p>

        {forms.length === 0 ? (
          <p className={styles.empty}>No report forms have been set up for this Domain yet.</p>
        ) : (
          <ul className={styles.list}>
            {forms.map((form) => (
              <li key={form.id}>
                <Link href={`${base}/forms/${form.id}`} className={styles.card}>
                  <span className={styles.formTitle}>{form.title}</span>
                  <span className={styles.meta}>{form.fields?.length ?? 0} fields</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </TenantShell>
  )
}

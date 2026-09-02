import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentsForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './home.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function TenantHomePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const myTenants = user ? await getTenantsForUser(user.id) : []
  const docs = await getDocumentsForTenant(tenant)
  const tokens = resolveThemeTokens(tenant)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section className={styles.welcome}>
        <h1 className={styles.welcomeTitle}>Welcome to {tenant.name}</h1>
        {tenant.motto ? <p className={styles.mottoLine}>{tenant.motto}</p> : null}
        <p className={styles.intro}>
          Public records, departmental documents, and other civic material — organized and
          available to residents.
        </p>
      </section>

      <section className={styles.recent}>
        <h2 className={styles.sectionTitle}>Recent records</h2>
        {docs.length === 0 ? (
          <p className={styles.empty}>No records filed yet.</p>
        ) : (
          <ul className={styles.docList}>
            {docs.map((doc) => (
              <li key={doc.id} className={styles.docItem}>
                <a className={styles.docLink} href={`/tenant/${tenant.slug}/documents/${doc.id}`}>
                  {doc.title}
                </a>
                <span className={styles.docOrigin}>{doc.origin.replace('-', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </TenantShell>
  )
}

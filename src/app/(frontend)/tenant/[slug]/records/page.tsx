import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentsForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './records.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function RecordsPage({ params }: Props) {
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
      <h1 className={styles.pageTitle}>Records</h1>
      <p className={styles.pageIntro}>
        Public records filed with {tenant.name}. Each record is filed under the city and can be
        viewed, edited, and exported.
      </p>

      {docs.length === 0 ? (
        <p className={styles.empty}>No records yet.</p>
      ) : (
        <ul className={styles.list}>
          {docs.map((doc) => (
            <li key={doc.id} className={styles.item}>
              <a className={styles.link} href={`/tenant/${tenant.slug}/documents/${doc.id}`}>
                {doc.title}
              </a>
              <div className={styles.itemMeta}>
                <span className={styles.origin}>{doc.origin.replace('-', ' ')}</span>
                {typeof doc.createdAt === 'string' ? (
                  <span>
                    Filed {new Date(doc.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </TenantShell>
  )
}

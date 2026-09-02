import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentsForTenant, getPageForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
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

  const base = `/tenant/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const docs = await getDocumentsForTenant(tenant)
  const homePage = await getPageForTenant(tenant, 'home')
  const tokens = resolveThemeTokens(tenant)
  const welcomeHtml = homePage ? renderMarkdown(homePage.body) : ''

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
        {welcomeHtml ? (
          <div className={styles.intro} dangerouslySetInnerHTML={{ __html: welcomeHtml }} />
        ) : (
          <p className={styles.intro}>Public records and civic material for {tenant.name}.</p>
        )}
        {user && homePage ? (
          <a className={styles.editLink} href={`${base}/pages/home/edit`}>
            Edit welcome
          </a>
        ) : null}
      </section>

      <nav className={styles.modulesRow} aria-label="Quick links">
        <a className={styles.module} href={`${base}/about`}>
          <span className={styles.moduleLabel}>About</span>
          <span className={styles.moduleHint}>Who we are and what we do</span>
        </a>
        <a className={styles.module} href={`${base}/departments`}>
          <span className={styles.moduleLabel}>Departments</span>
          <span className={styles.moduleHint}>Offices and services</span>
        </a>
        <a className={styles.module} href={`${base}/records`}>
          <span className={styles.moduleLabel}>Records</span>
          <span className={styles.moduleHint}>Public archive</span>
        </a>
      </nav>

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

import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getPageForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './about.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AboutPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const base = `/domain/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const page = await getPageForTenant(tenant, 'about')
  const tokens = resolveThemeTokens(tenant)
  const html = page ? renderMarkdown(page.body) : ''

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <article className={styles.article}>
        <div className={styles.actions}>
          {user && page ? (
            <a className={styles.action} href={`${base}/pages/about/edit`}>
              Edit
            </a>
          ) : null}
        </div>
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </TenantShell>
  )
}

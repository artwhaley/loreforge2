import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './lore.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function LorePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const myTenants = user ? await getTenantsForUser(user.id) : []
  const tokens = resolveThemeTokens(tenant)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <article className={styles.article}>
        <h1 className={styles.title}>Lore</h1>
      </article>
    </TenantShell>
  )
}
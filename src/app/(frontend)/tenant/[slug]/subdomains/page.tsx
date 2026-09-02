import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getSubdomainsForDomain } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function SubdomainsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const subdomains = await getSubdomainsForDomain(tenant.id)
  const domains = user ? await getTenantsForUser(user.id) : []
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>Subdomains</h1>
        <p>Subdomains are delegated organizational boundaries inside this Domain. They share Domain identity and are not nested tenants.</p>
        {subdomains.length === 0 ? <p>No Subdomains have been configured.</p> : <ul>{subdomains.map((subdomain) => <li key={subdomain.id}><h2><a href={`/domain/${slug}/subdomains/${subdomain.slug}`}>{subdomain.name}</a></h2><p>{subdomain.description || 'No description yet.'}</p></li>)}</ul>}
        <p><a href={`/domain/${slug}/members`}>Open Domain member roster</a></p>
      </section>
    </TenantShell>
  )
}

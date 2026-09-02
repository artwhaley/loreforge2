import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getSubdomainBySlug, getSubdomainMemberships } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string; subdomainSlug: string }> }
export const dynamic = 'force-dynamic'

export default async function SubdomainLandingPage({ params }: Props) {
  const { slug, subdomainSlug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const subdomain = await getSubdomainBySlug(tenant.id, subdomainSlug)
  if (!subdomain) notFound()
  const memberships = await getSubdomainMemberships(subdomain.id)
  const domains = user ? await getTenantsForUser(user.id) : []
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
      <section>
        <p><a href={`/domain/${slug}/subdomains`}>← Subdomains</a></p>
        <h1>{subdomain.name}</h1>
        <p>{subdomain.description || 'A delegated organizational boundary in this Domain.'}</p>
        <h2>Landing page</h2>
        <p>Folders, templates, and recent records for this Subdomain will appear here as they are configured.</p>
        <h2>Members</h2>
        {memberships.length === 0 ? <p>No active Subdomain members yet.</p> : <ul>{memberships.map((membership) => { const character = typeof membership.character === 'object' ? membership.character : null; return <li key={membership.id}>{character ? character.name : 'Unknown Character'}</li> })}</ul>}
        {role === 'admin' ? (
          <form action="/api/subdomain-memberships" method="post">
            <input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="subdomainId" value={subdomain.id} />
            <input name="characterId" inputMode="numeric" placeholder="Character ID" aria-label="Character ID to add" required />{' '}
            <button type="submit">Add Subdomain member</button>
          </form>
        ) : null}
        <p><a href={`/domain/${slug}/members`}>Back to Domain roster</a></p>
      </section>
    </TenantShell>
  )
}

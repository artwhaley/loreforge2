import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDomainMemberRows, getSubdomainsForDomain } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export default async function DomainMembersPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const domain = tenant as Parameters<typeof getDomainMemberRows>[0]
  const rows = await getDomainMemberRows(domain)
  const subdomains = await getSubdomainsForDomain(domain.id)
  const domains = user ? await getTenantsForUser(user.id) : []
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>Domain members</h1>
        <p>Characters belong to this Domain independently of their controlling account, local alias, Subdomain membership, and Roles.</p>
        {role === 'admin' ? (
          <form action="/api/domain-memberships" method="post">
            <input type="hidden" name="domainSlug" value={slug} />
            <input name="characterId" inputMode="numeric" placeholder="Character ID" aria-label="Character ID to add" required />{' '}
            <button type="submit">Add Character to Domain</button>
          </form>
        ) : null}
        <table>
          <thead><tr><th>Character</th><th>Domain-local alias</th><th>Controlling User</th><th>Domain membership</th><th>Subdomains</th>{role === 'admin' ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {rows.map(({ membership, character, localContext, controllingUser }) => (
              <tr key={membership.id}>
                <td>{character ? <a href={`/characters/${character.id}`}>{character.name}</a> : 'Unknown Character'}</td>
                <td>{localContext?.localDisplayName ?? '—'}</td>
                <td>{controllingUser?.name ?? 'Unclaimed'}</td>
                <td>{membership.status === 'active' ? 'Active' : 'Inactive'}</td>
                <td>{subdomains.filter(Boolean).length ? 'Manage separately' : 'None yet'}</td>
                {role === 'admin' ? <td><form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={character?.id ?? ''} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p>No active Character members yet.</p> : null}
        <p><a href={`/domain/${slug}/subdomains`}>View Subdomains</a></p>
      </section>
    </TenantShell>
  )
}

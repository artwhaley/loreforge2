import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getDomainMemberRows, getSubdomainMemberships, getSubdomainsForDomain } from '@/lib/domains/queries'
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
  const subdomainMemberships = (await Promise.all(subdomains.map(async (subdomain) => ({ subdomain, memberships: await getSubdomainMemberships(subdomain.id) })))).flatMap(({ subdomain, memberships }) => memberships.map((membership) => ({ characterId: typeof membership.character === 'object' ? membership.character?.id : membership.character, name: subdomain.name })))
  const subdomainsByCharacter = new Map<number, string[]>()
  for (const item of subdomainMemberships) if (item.characterId) subdomainsByCharacter.set(Number(item.characterId), [...(subdomainsByCharacter.get(Number(item.characterId)) ?? []), item.name])
  const payload = await getLorePayload()
  const roleAssignments = await payload.find({ collection: 'role-assignments', where: { status: { equals: 'active' } }, depth: 2, limit: 500 })
  const roleNamesByCharacter = new Map<number, string[]>()
  for (const assignment of roleAssignments.docs) {
    const roleRecord = typeof assignment.role === 'object' ? assignment.role : null
    const roleDomainId = roleRecord && typeof roleRecord.domain === 'object' ? roleRecord.domain.id : roleRecord?.domain
    if (String(roleDomainId) !== String(domain.id)) continue
    const characterId = typeof assignment.character === 'object' ? assignment.character?.id : assignment.character
    const roleName = roleRecord?.name ?? `Role ${assignment.role}`
    if (characterId && roleName) roleNamesByCharacter.set(Number(characterId), [...(roleNamesByCharacter.get(Number(characterId)) ?? []), roleName])
  }
  const domains = user ? await getTenantsForUser(user.id) : []
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>Domain members</h1>
        <p>Characters belong to this Domain independently of their controlling account, local alias, Department membership, and Roles.</p>
        {role === 'admin' ? <p><strong>Lifecycle:</strong> removing Domain membership also deactivates this Character's Department memberships and Role assignments. Re-adding the Domain never restores those narrower grants automatically.</p> : null}
        {role === 'admin' ? (
          <form action="/api/domain-memberships" method="post">
            <input type="hidden" name="domainSlug" value={slug} />
            <input name="characterId" inputMode="numeric" placeholder="Character ID" aria-label="Character ID to add" required />{' '}
            <button type="submit">Add Character to Domain</button>
          </form>
        ) : null}
        <table>
          <thead><tr><th>Character</th><th>Domain-local alias</th><th>Controlling User</th><th>Domain membership</th><th>Departments</th><th>Roles</th>{role === 'admin' ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {rows.map(({ membership, character, localContext, controllingUser }) => (
              <tr key={membership.id}>
                <td>{character ? <a href={`/characters/${character.id}`}>{character.name}</a> : 'Unknown Character'}</td>
                <td>{localContext?.localDisplayName ?? '—'}</td>
                <td>{controllingUser?.name ?? 'Unclaimed'}</td>
                <td>{membership.status === 'active' ? 'Active' : 'Inactive'}</td>
                <td>{character ? subdomainsByCharacter.get(Number(character.id))?.join(', ') ?? 'None' : 'None'}</td>
                <td>{character ? roleNamesByCharacter.get(Number(character.id))?.join(', ') ?? 'None' : 'None'}</td>
                {role === 'admin' ? <td><form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={character?.id ?? ''} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove Domain membership</button></form></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p>No active Character members yet.</p> : null}
        <p><a href={`/domain/${slug}/departments`}>View Departments</a></p>
      </section>
    </TenantShell>
  )
}

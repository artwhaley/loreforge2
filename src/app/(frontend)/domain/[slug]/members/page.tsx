import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getDepartmentParticipants, getDomainMemberRows, getSubdomainsForDomain } from '@/lib/domains/queries'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'
import { searchActiveCharacters } from '@/lib/people/characterSearch'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ q?: string }> }

export const dynamic = 'force-dynamic'

export default async function DomainMembersPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const q = String(query?.q ?? '').trim()
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const domain = tenant as Parameters<typeof getDomainMemberRows>[0]
  const rows = await getDomainMemberRows(domain)
  const subdomains = await getSubdomainsForDomain(domain.id)
  const subdomainMemberships = (await Promise.all(subdomains.map(async (subdomain) => ({ subdomain, memberships: await getDepartmentParticipants(subdomain.id) })))).flatMap(({ subdomain, memberships }) => memberships.map((membership) => ({ characterId: typeof membership.character === 'object' ? membership.character?.id : membership.character, name: subdomain.name })))
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
  const memberCharacterIds = new Set(rows.flatMap((row) => row.character ? [Number(row.character.id)] : []))
  let searchResults: { id: number; name: string }[] = []
  if (role === 'admin' && q) searchResults = (await searchActiveCharacters(payload, q)).filter((hit) => !memberCharacterIds.has(hit.id))
  const domains = user ? await getTenantsForUser(user.id) : []
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>{vocab.domain.singular} {vocab.member.plural}</h1>
        <p>Characters belong to this Domain independently of their controlling account and local alias. {vocab.subdomain.singular} participation is derived from the {vocab.role.plural} each Character holds.</p>
        {role === 'admin' ? <p><strong>Lifecycle:</strong> removing Domain membership removes this Character&apos;s Role assignments and direct Folder access. Re-adding the Domain starts clean.</p> : null}
        {role === 'admin' ? (
          <div>
            <form method="get">
              <input name="q" defaultValue={q} aria-label="Search Characters to add" placeholder="Search name or alias" />{' '}
              <button type="submit">Search</button>
            </form>
            {q ? (searchResults.length > 0 ? (
              <ul>
                {searchResults.map((hit) => (
                  <li key={hit.id}>{hit.name}{' '}
                    <form action="/api/domain-memberships" method="post" style={{ display: 'inline' }}>
                      <input type="hidden" name="domainSlug" value={slug} />
                      <input type="hidden" name="characterId" value={hit.id} />
                      <button type="submit">Add to Domain</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : <p>No matching Characters.</p>) : null}
          </div>
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
        {rows.length === 0 ? <p>No active Character {vocab.member.plural.toLowerCase()} yet.</p> : null}
        <p><a href={`/domain/${slug}/departments`}>View {vocab.subdomain.plural}</a></p>
      </section>
    </TenantShell>
  )
}
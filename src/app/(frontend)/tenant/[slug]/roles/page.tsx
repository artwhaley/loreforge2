import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export default async function RolesPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role: contextRole, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const payload = await getLorePayload()
  const roles = await payload.find({ collection: 'roles', where: { domain: { equals: tenant.id } }, depth: 1, limit: 500, sort: 'name' })
  const assignments = roles.docs.length
    ? await payload.find({ collection: 'role-assignments', where: { and: [{ role: { in: roles.docs.map((r) => r.id) } }, { status: { equals: 'active' } }] }, depth: 2, limit: 500, sort: 'createdAt' })
    : { docs: [] }
  const domainMemberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 500 })
  const domainCharacterIds = new Set(domainMemberships.docs.map((membership) => String(relationId(membership.character))))
  const characters = await payload.find({ collection: 'characters', where: { status: { equals: 'active' } }, depth: 0, limit: 500, sort: 'name' })
  const folders = await payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name' })
  const subdomains = await payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 100, sort: 'name' })
  const domains = user ? await getTenantsForUser(user.id) : []
  const roleName = new Map(roles.docs.map((r) => [Number(r.id), r.name]))
  const characterName = new Map(characters.docs.map((c) => [Number(c.id), c.name]))
  const folderById = new Map(folders.docs.map((f) => [Number(f.id), f]))
  const folderLabel = (id: number): string => {
    const names: string[] = []
    let current = folderById.get(id)
    const seen = new Set<number>()
    while (current && !seen.has(Number(current.id))) {
      seen.add(Number(current.id)); names.unshift(current.name)
      const parentId = relationId(current.parent)
      current = parentId ? folderById.get(parentId) : undefined
    }
    return names.join(' / ')
  }
  const isAdmin = contextRole === 'admin'
  const activeAssignments = assignments.docs.filter((assignment) => domainCharacterIds.has(String(relationId(assignment.character))))
  const assignableCharacters = characters.docs.filter((character) => domainCharacterIds.has(String(character.id)))
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={contextRole} switcherTenants={domains}>
      <section>
        <p><a href={`/domain/${slug}`}>← Domain home</a></p>
        <h1>Roles</h1>
        <p>Roles are Character assignments. Domain membership, Department membership, and Role assignment remain separate records. Each active assignment row is one independent grant; a Character may have the same Role across many folder scopes.</p>
        {roles.docs.length === 0 ? <p>No Roles have been configured.</p> : <ul>
          {roles.docs.map((item) => {
            const parent = relationId(item.parentRole)
            const subdomain = relationId(item.subdomain)
            const assignedCount = activeAssignments.filter((assignment) => relationId(assignment.role) === Number(item.id)).length
            return <li key={item.id}><strong>{item.name}</strong>{parent ? ` — reports to ${roleName.get(parent) ?? 'Role ' + parent}` : ' — top-level'}{subdomain ? ` — ${subdomains.docs.find((s) => Number(s.id) === subdomain)?.name ?? 'Department'}` : ' — Domain-wide'} · {assignedCount} assigned · <a href={`/domain/${slug}/manage/people?q=${encodeURIComponent(item.name)}`}>View People</a></li>
          })}
        </ul>}
        {isAdmin ? <>
          <details><summary>Create or assign Roles</summary>
          <h2>Create Role</h2><form action="/api/roles" method="post">
            <input type="hidden" name="domainSlug" value={slug} />
            <input name="name" placeholder="Role name" aria-label="Role name" required />{' '}
            <select name="parentRoleId" defaultValue=""><option value="">No superior (top-level)</option>{roles.docs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{' '}
            <select name="subdomainId" defaultValue=""><option value="">Domain-wide</option>{subdomains.docs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{' '}
            <button type="submit">Create Role</button>
          </form>
          <h2>Bulk assignment</h2><p>For one-person changes, use <a href={`/domain/${slug}/manage/people`}>People</a>. This bulk form remains for repeated assignments.</p><form action="/api/role-assignments" method="post">
            <input type="hidden" name="domainSlug" value={slug} />
            <input type="hidden" name="scopeInputMode" value="multi" />
            <select name="characterId" aria-label="Character" required><option value="">Choose Character</option>{assignableCharacters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{' '}
            <select name="roleId" aria-label="Role" required><option value="">Choose Role</option>{roles.docs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{' '}
            <label>Folder scopes (select any number){' '}<select name="scopeFolderIds" aria-label="Folder scopes" multiple size={6}>{folders.docs.filter((item) => !item.systemManaged).map((item) => <option key={item.id} value={item.id}>{folderLabel(Number(item.id))}</option>)}</select></label>{' '}
            <label><input type="checkbox" name="domainWide" value="1" /> Domain-wide</label>{' '}
            <button type="submit">Assign Role</button>
          </form></details>
        </> : null}
        <h2>Active assignments</h2>
        {activeAssignments.length === 0 ? <p>No active Role assignments.</p> : <table><thead><tr><th>Character</th><th>Role</th><th>Folder scope</th>{isAdmin ? <th>Actions</th> : null}</tr></thead><tbody>{activeAssignments.map((assignment) => { const character = relationId(assignment.character); const roleId = relationId(assignment.role); const scope = relationId(assignment.scopeFolder); return <tr key={assignment.id}><td>{characterName.get(character ?? -1) ?? `Character ${character ?? ''}`}</td><td>{roleName.get(roleId ?? -1) ?? `Role ${roleId ?? ''}`}</td><td>{scope ? folderLabel(scope) : 'Domain-wide'}</td>{isAdmin ? <td><form action="/api/role-assignments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={character ?? ''} /><input type="hidden" name="roleId" value={roleId ?? ''} /><input type="hidden" name="scopeFolderId" value={scope ?? ''} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form></td> : null}</tr> })}</tbody></table>}
        <p><a href={`/domain/${slug}/members`}>Open Domain member roster</a></p>
      </section>
    </TenantShell>
  )
}

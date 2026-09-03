import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { flattenFolderTree, buildFolderTree } from '@/lib/archive/folderTree'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string; characterId: string }> }
const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

export const dynamic = 'force-dynamic'

export default async function PersonWorkspacePage({ params }: Props) {
  const { slug, characterId: rawCharacterId } = await params
  const characterId = Number(rawCharacterId)
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || role !== 'admin' || !Number.isFinite(characterId)) notFound()
  const payload = await getLorePayload()
  const [character, membershipRows, contexts, departments, departmentMemberships, roles, assignments, folders, domains] = await Promise.all([
    payload.findByID({ collection: 'characters', id: characterId, depth: 1 }).catch(() => null),
    payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 20 }),
    payload.find({ collection: 'domain-character-contexts', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 1 }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 200, sort: 'name' }),
    payload.find({ collection: 'subdomain-memberships', where: { character: { equals: characterId } }, depth: 1, limit: 500 }),
    payload.find({ collection: 'roles', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name' }),
    payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 2, limit: 500 }),
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 1, limit: 500, sort: 'name' }),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  if (!character) notFound()
  const domainMembership = membershipRows.docs[0]
  const localContext = contexts.docs[0]
  const departmentById = new Map(departments.docs.map((department) => [String(department.id), department]))
  const departmentMembershipRows = departmentMemberships.docs.filter((item) => item.status === 'active').map((item) => ({ item, department: departmentById.get(String(relationId(item.subdomain))) })).filter((item): item is { item: typeof item.item; department: NonNullable<typeof item.department> } => Boolean(item.department))
  const roleById = new Map(roles.docs.map((item) => [String(item.id), item]))
  const assignmentRows = assignments.docs.map((assignment) => ({ assignment, role: roleById.get(String(relationId(assignment.role))) })).filter((item): item is { assignment: typeof item.assignment; role: NonNullable<typeof item.role> } => Boolean(item.role))
  const folderById = new Map(folders.docs.map((folder) => [Number(folder.id), folder]))
  const folderLabel = (folderId: number | null) => {
    if (!folderId) return 'Domain-wide'
    const names: string[] = []; let current = folderById.get(folderId); const seen = new Set<number>()
    while (current && !seen.has(Number(current.id))) { seen.add(Number(current.id)); names.unshift(current.name); const parentId = relationId(current.parent); current = parentId ? folderById.get(parentId) : undefined }
    return names.join(' / ')
  }
  const tree = flattenFolderTree(buildFolderTree(folders.docs))
  const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section className="personWorkspace"><p><a href={`/domain/${slug}/manage/people`}>People</a> / {localContext?.localDisplayName || character.name}</p><header><h1>{localContext?.localDisplayName || character.name}</h1><p>{character.name}{controller?.name ? ` · controlled by ${controller.name}` : ' · Unclaimed Character'}</p></header>
      <nav aria-label="Character workspace sections"><a href="#overview">Overview</a> · <a href="#departments">Departments</a> · <a href="#roles">Roles</a> · <a href="#access">Access</a> · <a href="#recent-work">Recent Work</a> · <a href="#history">History</a></nav>
      <section id="overview"><h2>Overview</h2><p>Global Character identity stays separate from this Domain’s local display and membership.</p>{domainMembership?.status === 'active' ? <p><strong>Domain membership:</strong> Active</p> : <p><strong>Domain membership:</strong> Not active</p>}{domainMembership?.status === 'active' ? <form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove from Domain</button></form> : <form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><button type="submit">Add to Domain</button></form>}</section>
      <section id="departments"><h2>Departments</h2>{departmentMembershipRows.length ? <ul>{departmentMembershipRows.map(({ item, department }) => <li key={item.id}>{department.name} <form style={{ display: 'inline' }} action="/api/subdomain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="subdomainId" value={department.id} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form></li>)}</ul> : <p>No active Department memberships.</p>}<details><summary>Add to a Department</summary><form action="/api/subdomain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><select name="subdomainId" required><option value="">Choose Department</option>{departments.docs.filter((department) => !departmentMembershipRows.some(({ department: current }) => current.id === department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button type="submit">Add Department</button></form></details></section>
      <section id="roles"><h2>Roles</h2>{assignmentRows.length ? <ul>{assignmentRows.map(({ assignment, role: assignedRole }) => <li key={assignment.id}>{assignedRole.name} · {folderLabel(relationId(assignment.scopeFolder))} <form style={{ display: 'inline' }} action="/api/role-assignments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="roleId" value={assignedRole.id} /><input type="hidden" name="scopeFolderId" value={relationId(assignment.scopeFolder) ?? ''} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form></li>)}</ul> : <p>No active Role assignments.</p>}<details><summary>Add a Role and optional folder scopes</summary><form action="/api/role-assignments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="scopeInputMode" value="multi" /><label>Role <select name="roleId" required><option value="">Choose Role</option>{roles.docs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Folder scopes <select name="scopeFolderIds" multiple size={6}>{folders.docs.filter((folder) => !folder.systemManaged).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><label><input type="checkbox" name="domainWide" value="1" /> Include Domain-wide</label><button type="submit">Assign Role</button></form></details></section>
      <section id="access"><h2>Access</h2><p className="accessNotice">Effective access editing arrives with the authorization phase. These are factual Phase 3 Role-scope indicators, not final Can view/edit/manage decisions.</p><ul>{tree.map(({ folder, depth }) => { const scoped = assignmentRows.filter(({ assignment }) => relationId(assignment.scopeFolder) === Number(folder.id)); return <li key={folder.id} style={{ marginLeft: `${depth * 1.1}rem` }}><strong>{folder.name}</strong> · {scoped.length ? scoped.map(({ role: assignedRole }) => assignedRole.name).join(', ') : 'No direct Role scope'}</li> })}</ul></section>
      <section id="recent-work"><h2>Recent Work</h2><p>Recent work will appear here when the activity feed is connected.</p></section><section id="history"><h2>History</h2><p>Membership and assignment history remain available in the record timeline. A unified workspace history arrives with later activity work.</p></section>
    </section>
  </TenantShell>
}

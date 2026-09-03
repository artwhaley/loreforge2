import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { flattenFolderTree, buildFolderTree } from '@/lib/archive/folderTree'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { RoleAssignmentToggle } from '@/components/roles/RoleAssignmentToggle'

type Props = { params: Promise<{ slug: string; characterId: string }>; searchParams?: Promise<{ roleFilter?: string; folderQuery?: string }> }

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

const polyId = (value: unknown) => typeof value === 'object' && value !== null && 'value' in value ? relationId((value as { value: unknown }).value) : relationId(value)

const parentId = (value: unknown) => relationId(value)

export const dynamic = 'force-dynamic'

export default async function PersonWorkspacePage({ params, searchParams }: Props) {
  const { slug, characterId: rawCharacterId } = await params
  const characterId = Number(rawCharacterId)
  const query = await searchParams
  const roleFilter = query?.roleFilter === 'held' ? 'held' : 'assignable'
  const folderQuery = query?.folderQuery?.trim() ?? ''
  const { tenant, role: contextRole, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || contextRole !== 'admin' || !Number.isFinite(characterId)) notFound()
  const payload = await getLorePayload()
  const [character, membershipRows, contexts, departments, roles, assignments, folders, permissionRules, domains] = await Promise.all([
    payload.findByID({ collection: 'characters', id: characterId, depth: 1 }).catch(() => null),
    payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 20 }),
    payload.find({ collection: 'domain-character-contexts', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 1 }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 200, sort: 'name' }),
    payload.find({ collection: 'roles', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 1000, sort: 'name' }),
    payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 1, limit: 1000 }),
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 1, limit: 1000, sort: 'name' }),
    payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: tenant.id } }, { principalType: { equals: 'Character' } }] }, depth: 0, limit: 5000 }).catch(() => ({ docs: [] })),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  if (!character) notFound()
  const membership = membershipRows.docs[0]
  const localContext = contexts.docs[0]
  const roleById = new Map(roles.docs.map((item) => [String(item.id), item]))
  const assignedRoleIds = new Set(assignments.docs.map((assignment) => String(relationId(assignment.role))))
  const departmentById = new Map(departments.docs.map((department) => [String(department.id), department]))
  const roleRows = roles.docs.filter((item) => roleFilter === 'held' ? assignedRoleIds.has(String(item.id)) : true)
  const assignedRules = permissionRules.docs.filter((rule) => polyId(rule.principal) === characterId && rule.resourceType === 'Folder' && rule.active !== false)
  const ruleFor = (folderId: number, capabilities: string[]) => assignedRules.find((rule) => polyId(rule.resource) === folderId && capabilities.includes(rule.capability))
  const folderTree = flattenFolderTree(buildFolderTree(folders.docs))
  const visibleFolders = folderQuery
    ? folderTree.filter(({ folder }) => folder.name.toLocaleLowerCase().includes(folderQuery.toLocaleLowerCase()))
    : folderTree
  const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
  const pageUrl = `/domain/${slug}/manage/people/${characterId}`
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={contextRole} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section className="personWorkspace">
      <p><a href={`/domain/${slug}/manage/people`}>People</a> / {localContext?.localDisplayName || character.name}</p>
      <header><h1>{localContext?.localDisplayName || character.name}</h1><p>{character.name}{controller?.name ? ` · controlled by ${controller.name}` : ' · Unclaimed Character'}</p></header>
      <nav aria-label="Character workspace sections"><a href="#overview">Overview</a> · <a href="#roles">Roles</a> · <a href="#folder-access">Folder access</a> · <a href="#recent-work">Recent Work</a> · <a href="#history">History</a></nav>
      <section id="overview"><h2>Overview</h2><p>Domain membership is separate from the Character's Roles. Department participation is derived from active Department-owned Roles.</p><p><strong>Domain membership:</strong> {membership?.status === 'active' ? 'Active' : 'Not active'}</p>{membership?.status === 'active' ? <form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove from Domain</button></form> : <form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><button type="submit">Add to Domain</button></form>}</section>
      <section id="roles"><h2>Roles</h2><p>Roles belong to Departments. Assigning or removing one never edits Folder access.</p><p><a href={`${pageUrl}?roleFilter=held`}>Held roles</a> · <a href={`${pageUrl}?roleFilter=assignable`}>Roles I can assign</a></p><div role="tree" aria-label="Department Roles">{roleRows.map((item) => { const department = departmentById.get(String(relationId(item.subdomain))); const held = assignedRoleIds.has(String(item.id)); const parent = roleById.get(String(relationId(item.parentRole))); return <div key={item.id} role="treeitem" aria-level={parent ? 2 : 1} style={{ marginLeft: parent ? '1.5rem' : 0 }}><RoleAssignmentToggle domainSlug={slug} characterId={characterId} roleId={Number(item.id)} checked={held} label={item.name} /><span> · {department?.name ?? 'Department'}{parent ? ` · reports to ${parent.name}` : ''}</span></div> })}</div>{roleRows.length === 0 ? <p>{roleFilter === 'held' ? 'No held Roles.' : 'No Roles available.'}</p> : null}</section>
      <section id="folder-access"><h2>Folder access</h2><p>Direct Character access is separate from Roles. These controls are provisional until the Phase 7 evaluator; they never mutate a Role assignment.</p><form method="get" action={pageUrl}><input type="hidden" name="roleFilter" value={roleFilter} /><label htmlFor="folder-search">Search folders</label> <input id="folder-search" name="folderQuery" type="search" defaultValue={folderQuery} placeholder="Find a folder…" /> <button type="submit">Search</button>{folderQuery ? <a href={`${pageUrl}?roleFilter=${roleFilter}#folder-access`}>Clear</a> : null}</form><ul>{visibleFolders.map(({ folder, depth }) => { const readRule = ruleFor(Number(folder.id), ['read']); const writeRule = ruleFor(Number(folder.id), ['create_document', 'edit_document']); const readState = readRule?.effect ?? 'inherit'; const writeState = writeRule?.effect ?? 'inherit'; return <li key={folder.id} style={{ marginLeft: `${depth * 1.1}rem` }}><form action="/api/permission-rules" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="folderId" value={folder.id} /><strong>{folder.name}</strong> <label>Read <select name="readState" defaultValue={readState}><option value="inherit">Inherited</option><option value="grant">Allow</option><option value="deny">Deny</option></select></label> <label>Write <select name="writeState" defaultValue={writeState}><option value="inherit">Inherited</option><option value="grant">Allow</option><option value="deny">Deny</option></select></label> <button type="submit">Save</button><small> · Read source: {readRule ? 'Direct Character rule' : 'Role / Folder default'} · Write source: {writeRule ? 'Direct Character rule' : 'Role / Folder default'}</small></form></li> })}</ul>{folderTree.length === 0 ? <p>No Folders are configured.</p> : visibleFolders.length === 0 ? <p>No folders match “{folderQuery}”.</p> : null}</section>
      <section id="recent-work"><h2>Recent Work</h2><p>Recent work will appear here when the activity feed is connected.</p></section><section id="history"><h2>History</h2><p>Role and Folder changes are audited. A unified history feed arrives with later activity work.</p></section>
    </section>
  </TenantShell>
}

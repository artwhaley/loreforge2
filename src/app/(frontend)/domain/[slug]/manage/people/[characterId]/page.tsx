import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { FolderTree, RoleTree, type FolderTreeNode, type PermissionState, type RoleDepartment, type RoleTreeNode } from '@/components/people/PersonAccessTrees'
import { canAssignRole } from '@/lib/authz/delegation'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveFolderPermission } from '@/lib/authz/folderAccess'
import styles from '@/components/people/PersonWorkspace.module.scss'

type Props = { params: Promise<{ slug: string; characterId: string }>; searchParams?: Promise<{ roleFilter?: string }> }

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

const polyId = (value: unknown) => typeof value === 'object' && value !== null && 'value' in value ? relationId((value as { value: unknown }).value) : relationId(value)

export const dynamic = 'force-dynamic'

export default async function PersonWorkspacePage({ params, searchParams }: Props) {
  const { slug, characterId: rawCharacterId } = await params
  const characterId = Number(rawCharacterId)
  const query = await searchParams
  const roleFilter = query?.roleFilter === 'held' ? 'held' : 'assignable'
  const { tenant, role: contextRole, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !Number.isFinite(characterId)) notFound()
  const payload = await getLorePayload()
  const actor = { userId: user?.id ?? 0, activeCharacterId: activeCharacter?.id ?? null }
  const workspaceAllowed = contextRole === 'admin' || Boolean(user && (await Promise.all(['manage_members', 'manage_roles', 'manage_access'].map((capability) => isAllowed({ payload, actor, domainId: tenant.id, capability, resource: { type: 'Domain', id: tenant.id } })))).some(Boolean))
  if (!workspaceAllowed) notFound()
  const canManageMembers = Boolean(user && await isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_members', resource: { type: 'Domain', id: tenant.id } }))
  const [character, membershipRows, contexts, departments, roles, assignments, folders, permissionRules, domains] = await Promise.all([
    payload.findByID({ collection: 'characters', id: characterId, depth: 1 }).catch(() => null),
    payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 }),
    payload.find({ collection: 'domain-character-contexts', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 1 }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 200, sort: 'name' }),
    payload.find({ collection: 'roles', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 1000, sort: 'name' }),
    payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 1, limit: 1000 }),
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 1, limit: 1000, sort: 'name' }),
    payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: tenant.id } }, { principalType: { equals: 'Character' } }] }, depth: 0, limit: 5000 }).catch(() => ({ docs: [] })),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  if (!character || !membershipRows.docs[0]) notFound()
  const localContext = contexts.docs[0]
  const roleById = new Map(roles.docs.map((item) => [String(item.id), item]))
  const assignedRoleIds = new Set(assignments.docs.map((assignment) => String(relationId(assignment.role))))
  const assignableRoleIds = new Set((await Promise.all(roles.docs.map(async (item) => (user && await canAssignRole(payload, { actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, targetRoleId: item.id }) ? Number(item.id) : null)))).filter((id): id is number => id !== null))
  const assignedRules = permissionRules.docs.filter((rule) => polyId(rule.principal) === characterId && rule.resourceType === 'Folder' && rule.active !== false)
  const ruleFor = (folderId: number, capabilities: string[]) => assignedRules.find((rule) => polyId(rule.resource) === folderId && capabilities.includes(rule.capability))
  const folderTree = buildFolderTree(folders.docs)
  const roleNodes = new Map<number, RoleTreeNode>()
  for (const item of roles.docs) roleNodes.set(Number(item.id), { id: Number(item.id), name: item.name, held: assignedRoleIds.has(String(item.id)), assignable: assignableRoleIds.has(Number(item.id)), children: [] })
  const rolesByDepartment = new Map<number, RoleTreeNode[]>()
  for (const item of roles.docs) {
    const node = roleNodes.get(Number(item.id))
    const departmentId = relationId(item.subdomain)
    if (!node || departmentId === null) continue
    const parentRoleId = relationId(item.parentRole)
    const parent = parentRoleId === null ? null : roleNodes.get(parentRoleId)
    const parentDepartmentId = parentRoleId === null ? null : relationId(roleById.get(String(parentRoleId))?.subdomain)
    if (parent && parentDepartmentId === departmentId) continue
    const roots = rolesByDepartment.get(departmentId) ?? []
    roots.push(node)
    rolesByDepartment.set(departmentId, roots)
  }
  for (const item of roles.docs) {
    const node = roleNodes.get(Number(item.id))
    const parentRoleId = relationId(item.parentRole)
    const parent = parentRoleId === null ? null : roleNodes.get(parentRoleId)
    const departmentId = relationId(item.subdomain)
    const parentDepartmentId = parentRoleId === null ? null : relationId(roleById.get(String(parentRoleId))?.subdomain)
    if (node && parent && departmentId !== null && parentDepartmentId === departmentId) parent.children.push(node)
  }
  const roleDepartments: RoleDepartment[] = departments.docs.map((department) => ({ id: Number(department.id), name: department.name, roles: rolesByDepartment.get(Number(department.id)) ?? [] })).filter((department) => department.roles.length > 0)
  const toPermissionState = (folderId: number, capabilities: string[]): PermissionState => (ruleFor(folderId, capabilities)?.effect as PermissionState | undefined) ?? 'inherit'
  const controllerId = relationId(character.controlledBy)
  const subjectActor = controllerId == null ? null : { userId: controllerId, activeCharacterId: characterId }
  const explanation = async (folderId: number) => {
    if (!subjectActor) return null
    const decision = await resolveFolderPermission({ payload, actor: subjectActor, domainId: tenant.id, folderId })
    const source = (value: typeof decision.read) => value.matchedRule ? `${value.matchedRule.principalType} rule` : value.reason.replace(/\.$/, '')
    return { read: { allowed: decision.read.allowed, source: source(decision.read) }, write: { allowed: decision.write.allowed, source: source(decision.write) } }
  }
  const toFolderNode = async (node: ReturnType<typeof buildFolderTree>[number]): Promise<FolderTreeNode> => {
    const effective = await explanation(Number(node.folder.id))
    return {
      id: Number(node.folder.id),
      name: node.folder.name,
      systemManaged: Boolean(node.folder.systemManaged),
      readState: toPermissionState(Number(node.folder.id), ['read']),
      writeState: toPermissionState(Number(node.folder.id), ['create_document', 'edit_document']),
      effectiveRead: effective?.read,
      effectiveWrite: effective?.write,
      children: await Promise.all(node.children.map(toFolderNode)),
    }
  }
  const folderNodes = await Promise.all(folderTree.map(toFolderNode))
  const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={contextRole} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section className={styles.page}>
      <p className={styles.crumb}><a href={`/domain/${slug}/manage/people`}>People</a> / {localContext?.localDisplayName || character.name}</p>
      <header className={styles.identityHeader}>
        <div className={styles.nameLine}><h1>{localContext?.localDisplayName || character.name}</h1><span className={styles.characterHandle}>{controller?.name || controller?.email || 'Unclaimed Character'}</span></div>
        {canManageMembers ? <form action="/api/domain-memberships" method="post" className={styles.removeForm}><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove from Domain</button></form> : null}
      </header>
      <RoleTree domainSlug={slug} characterId={characterId} departments={roleDepartments} initialMode={roleFilter} />
      <FolderTree domainSlug={slug} characterId={characterId} folders={folderNodes} />
      <section className={styles.recentWork}><h2>Recent Work</h2><p>Recent work will appear here when the activity feed is connected.</p></section>
    </section>
  </TenantShell>
}

import { notFound } from 'next/navigation'

import { type FolderTreeNode, type PermissionState, type RoleDepartment, type RoleTreeNode } from '@/components/people/PersonAccessTrees'
import { RoleManager } from '@/components/roles/RoleManager'
import { TenantShell } from '@/components/theme/TenantShell'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ roleId?: string }> }
export const dynamic = 'force-dynamic'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

function toFolderNode(node: ReturnType<typeof buildFolderTree>[number]): FolderTreeNode {
  return { id: Number(node.folder.id), name: node.folder.name, systemManaged: Boolean(node.folder.systemManaged), readState: 'inherit', writeState: 'inherit', children: node.children.map(toFolderNode) }
}

export default async function RolesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role: contextRole, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || contextRole !== 'admin') notFound()
  const payload = await getLorePayload()
  const [departments, roles, assignments, memberships, characters, folders, permissionRules, domains] = await Promise.all([
    payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name' }),
    payload.find({ collection: 'roles', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 1000, sort: 'name' }),
    payload.find({ collection: 'role-assignments', where: { status: { equals: 'active' } }, depth: 0, limit: 5000 }),
    payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 5000 }),
    payload.find({ collection: 'characters', where: { status: { equals: 'active' } }, depth: 0, limit: 5000, sort: 'name' }),
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 2000, sort: 'name' }),
    payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: tenant.id } }, { principalType: { equals: 'Role' } }, { resourceType: { equals: 'Folder' } }] }, depth: 0, limit: 10000 }).catch(() => ({ docs: [] })),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])

  const roleById = new Map(roles.docs.map((item) => [Number(item.id), item]))
  const roleNodes = new Map<number, RoleTreeNode>()
  for (const item of roles.docs) roleNodes.set(Number(item.id), { id: Number(item.id), name: item.name, held: false, children: [] })
  const rolesByDepartment = new Map<number, RoleTreeNode[]>()
  for (const item of roles.docs) {
    const node = roleNodes.get(Number(item.id))
    const departmentId = relationId(item.subdomain)
    if (!node || departmentId === null) continue
    const parentRoleId = relationId(item.parentRole)
    const parent = parentRoleId === null ? null : roleNodes.get(parentRoleId)
    const parentDepartmentId = parentRoleId === null ? null : relationId(roleById.get(parentRoleId)?.subdomain)
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
    const parentDepartmentId = parentRoleId === null ? null : relationId(roleById.get(parentRoleId)?.subdomain)
    if (node && parent && departmentId !== null && parentDepartmentId === departmentId) parent.children.push(node)
  }
  const roleDepartments: RoleDepartment[] = departments.docs.map((department) => ({ id: Number(department.id), name: department.name, roles: rolesByDepartment.get(Number(department.id)) ?? [] })).filter((department) => department.roles.length > 0)
  const domainCharacterIds = new Set(memberships.docs.map((membership) => String(relationId(membership.character))))
  const characterName = new Map(characters.docs.map((character) => [Number(character.id), character.name]))
  const holdersByRole: Record<string, { id: number; name: string }[]> = {}
  for (const assignment of assignments.docs) {
    const characterId = relationId(assignment.character)
    const roleId = relationId(assignment.role)
    if (characterId === null || roleId === null || !domainCharacterIds.has(String(characterId)) || !characterName.has(characterId)) continue
    const holders = holdersByRole[String(roleId)] ?? []
    if (!holders.some((holder) => holder.id === characterId)) holders.push({ id: characterId, name: characterName.get(characterId)! })
    holdersByRole[String(roleId)] = holders
  }
  const folderNodes = buildFolderTree(folders.docs).map(toFolderNode)
  const folderStatesByRole: Record<string, Record<string, { readState: PermissionState; writeState: PermissionState }>> = {}
  for (const rule of permissionRules.docs) {
    if (rule.active === false) continue
    const roleId = relationId(rule.principal)
    const folderId = relationId(rule.resource)
    if (roleId === null || folderId === null) continue
    const current = folderStatesByRole[String(roleId)] ?? {}
    const state = current[String(folderId)] ?? { readState: 'inherit' as PermissionState, writeState: 'inherit' as PermissionState }
    if (rule.capability === 'read') state.readState = rule.effect as PermissionState
    if (rule.capability === 'create_document' || rule.capability === 'edit_document') state.writeState = rule.effect as PermissionState
    current[String(folderId)] = state
    folderStatesByRole[String(roleId)] = current
  }
  const roleRecords = roles.docs.map((item) => ({ id: Number(item.id), name: item.name, departmentId: relationId(item.subdomain) ?? 0, parentRoleId: relationId(item.parentRole) }))
  const requestedRoleId = Number(query?.roleId ?? '')
  const initialRoleId = Number.isFinite(requestedRoleId) && requestedRoleId > 0 ? requestedRoleId : null
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={contextRole} switcherTenants={domains}>
    <section>
      <p><a href={`/domain/${slug}`}>← Domain home</a></p>
      <h1>Roles</h1>
      <RoleManager domainSlug={slug} departments={roleDepartments} roleRecords={roleRecords} holdersByRole={holdersByRole} folders={folderNodes} folderStatesByRole={folderStatesByRole} initialRoleId={initialRoleId} />
    </section>
  </TenantShell>
}

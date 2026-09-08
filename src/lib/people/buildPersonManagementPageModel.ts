import type { Character, Domain, Tenant, User } from '@/payload-types'

import { type FolderTreeNode, type PermissionState, type RoleDepartment, type RoleTreeNode } from '@/components/people/PersonAccessTrees'
import type { PersonManagementPageModel, PersonTypeAccessSummary } from '@/lib/page-models/management/people'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { getLorePayload } from '@/lib/payload'
import { canAssignRoleInSession } from '@/lib/authz/delegation'
import { decideOne, loadAuthorizationSession } from '@/lib/authz/session'
import { resolveFolderPermissionInSession } from '@/lib/authz/folderAccess'
import { canOpenPeopleSession, folderControlsSession } from '@/lib/authz/workspaces'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

const polyId = (value: unknown) => typeof value === 'object' && value !== null && 'value' in value ? relationId((value as { value: unknown }).value) : relationId(value)

type TypeAccessSummary = { id: number; name: string; read: { allowed: boolean; source: string }; create: { allowed: boolean; source: string }; edit: { allowed: boolean; source: string } }

/**
 * Person workspace Page Model builder (OBSIDIAN-T06). Ports the person route
 * projection exactly: one request-owned session for the ACTOR decides
 * admission and every capability; a separately identified session for the
 * SUBJECT drives effective Type/Folder access. User/controller and Character
 * stay distinct. Returns null for not-found or not-admitted.
 */
export async function buildPersonManagementPageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'> | null
  activeCharacter: Character | null
  characterId: number
  roleFilter: 'held' | 'assignable'
}): Promise<PersonManagementPageModel | null> {
  const { tenant, user, activeCharacter, characterId, roleFilter } = input
  if (!Number.isFinite(characterId)) return null
  const payload = await getLorePayload()
  const actor = { userId: user?.id ?? 0, activeCharacterId: activeCharacter?.id ?? null }
  const session = user ? await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id) : null
  const workspaceAllowed = session ? (session.authority != null
    || ['manage_members', 'manage_roles', 'manage_access'].some((capability) => decideOne(session, capability as never, { type: 'Domain', id: session.domainId }).allowed)
    || await canOpenPeopleSession(session)) : false
  if (!workspaceAllowed) return null
  const canManageMembers = Boolean(session && (session.authority != null || decideOne(session, 'manage_members', { type: 'Domain', id: Number(tenant.id) }).allowed))

  const [character, membershipRows, contexts, departments, roles, assignments, folders, permissionRules, types] = await Promise.all([
    payload.findByID({ collection: 'characters', id: characterId, depth: 1 }).catch(() => null),
    payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 }),
    payload.find({ collection: 'domain-character-contexts', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 1 }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 0, pagination: false, sort: 'name' }),
    payload.find({ collection: 'roles', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 0, pagination: false, sort: 'name' }),
    payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 1, limit: 0, pagination: false }),
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 1, limit: 0, pagination: false, sort: 'name' }),
    payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: tenant.id } }, { principalType: { equals: 'Character' } }] }, depth: 0, limit: 0, pagination: false }).catch(() => ({ docs: [] })),
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 0, pagination: false, sort: 'name' }),
  ])
  if (!character || !membershipRows.docs[0]) return null

  const localContext = contexts.docs[0]
  const roleById = new Map(roles.docs.map((item) => [String(item.id), item]))
  const assignedRoleIds = new Set(assignments.docs.map((assignment) => String(relationId(assignment.role))))
  const assignableRoleIds = new Set(session ? roles.docs.map((item) => canAssignRoleInSession(session, item.id) ? Number(item.id) : null).filter((id): id is number => id !== null) : [])
  const assignedRules = permissionRules.docs.filter((rule) => polyId(rule.principal) === characterId && rule.resourceType === 'Folder' && rule.active !== false)
  const ruleFor = (folderId: number, capabilities: string[]) => assignedRules.find((rule) => polyId(rule.resource) === folderId && capabilities.includes(rule.capability))

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
  const subjectSession = controllerId == null ? null : await loadAuthorizationSession(payload, { userId: controllerId, activeCharacterId: characterId }, tenant.id).catch(() => null)

  const typeAccess: PersonTypeAccessSummary[] = subjectSession ? types.docs.map((type) => {
    const source = (decision: ReturnType<typeof decideOne>) => decision.reason.replace(/\.$/, '')
    const read = decideOne(subjectSession, 'read', { type: 'DocumentType', id: Number(type.id) })
    const create = decideOne(subjectSession, 'create_document', { type: 'DocumentType', id: Number(type.id) })
    const edit = decideOne(subjectSession, 'edit_document', { type: 'DocumentType', id: Number(type.id) })
    return { id: Number(type.id), name: type.name, read: { allowed: read.allowed, source: source(read) }, create: { allowed: create.allowed, source: source(create) }, edit: { allowed: edit.allowed, source: source(edit) } }
  }) : []

  const explanation = (folderId: number) => {
    if (!subjectSession) return null
    const decision = resolveFolderPermissionInSession(subjectSession, folderId)
    const source = (value: typeof decision.read) => value.matchedRule ? `${value.matchedRule.principalType} rule` : value.reason.replace(/\.$/, '')
    return { read: { allowed: decision.read.allowed, source: source(decision.read) }, write: { allowed: decision.write.allowed, source: source(decision.write) } }
  }
  const toFolderNode = (node: ReturnType<typeof buildFolderTree>[number]): FolderTreeNode => {
    const effective = explanation(Number(node.folder.id))
    const controls = session ? folderControlsSession(session, [node.folder.id]).get(Number(node.folder.id)) : undefined
    return {
      id: Number(node.folder.id),
      name: node.folder.name,
      systemManaged: Boolean(node.folder.systemManaged),
      canManageAccess: controls?.canManageAccess ?? false,
      canGrantRead: controls?.canGrantRead ?? false,
      canGrantWrite: controls?.canGrantWrite ?? false,
      readState: toPermissionState(Number(node.folder.id), ['read']),
      writeState: toPermissionState(Number(node.folder.id), ['create_document', 'edit_document']),
      effectiveRead: effective?.read,
      effectiveWrite: effective?.write,
      children: node.children.map(toFolderNode),
    }
  }
  const folderNodes = buildFolderTree(folders.docs).map(toFolderNode)
  const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null

  return {
    baseUrl: `/domain/${tenant.slug}`,
    domainSlug: tenant.slug,
    domainName: tenant.name,
    character: { id: characterId, name: character.name, kind: String(character.kind ?? 'player'), status: String(character.status ?? 'active') },
    controller: controller ? { id: Number(controller.id), name: controller.name ?? null, email: controller.email ?? '' } : null,
    localDisplayName: localContext?.localDisplayName ?? null,
    roleDepartments,
    folderNodes,
    typeAccess,
    canManageMembers,
    roleFilter,
    status: null,
  }
}
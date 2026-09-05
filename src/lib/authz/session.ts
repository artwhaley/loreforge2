import type { Payload } from 'payload'

import type { Capability, PrincipalType, ResourceType } from '@/lib/permissions/capabilities'
import type { RoleNode } from './roleTree'

/**
 * P07P-02: one request-owned authorization session.
 *
 * Loads every reusable fact a decision needs exactly once (authority, acting
 * Character tuple, Domain roles, active assignments, applicable rules, and
 * folder ancestry metadata), indexes them in memory, and serves unlimited
 * pure decisions with ZERO additional SQL. Frozen permission semantics are
 * unchanged — this only removes repeated I/O (spec "Target design").
 *
 * Lifetime rules (spec "Loading and lifetime"):
 * - one session per request per (User, active Character, Domain, transaction);
 * - no module-global state, no TTL cache, no cross-request reuse of answers;
 * - mutations start a fresh session inside their transaction.
 */

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

const polymorphic = (value: unknown): { relationTo: string | null; id: number | null } => {
  if (!value || typeof value !== 'object') return { relationTo: null, id: idOf(value) }
  const row = value as Record<string, unknown>
  const relationTo = row.relationTo === undefined ? null : String(row.relationTo)
  return { relationTo, id: idOf(row.value ?? row.id) }
}

const relationForPrincipal: Record<PrincipalType, string> = { Character: 'characters', User: 'users', Role: 'roles', DomainMembership: 'domain-memberships' }
const relationForResource: Record<ResourceType, string> = { Domain: 'domains', Subdomain: 'subdomains', Folder: 'folders', Document: 'documents' }

export type AuthzActor = { userId: number | string; activeCharacterId?: number | string | null }
export type AuthzResourceRef = { type: ResourceType; id: number | string }

type RuleRow = {
  id: number | string
  capability: Capability
  effect: 'grant' | 'deny'
  principalType: PrincipalType
  principalId: number
  resourceType: ResourceType
  resourceId: number
}

/** P07P: lexicographic specificity — a longer chain is strictly more specific. */
export type Specificity = { tier: number; chain: number[] }
/** Positive when `a` is MORE specific than `b` (Document > deepest Folder > Department > Domain). */
export const specificitiesCompare = (a: Specificity, b: Specificity): number => {
  if (a.tier !== b.tier) return b.tier - a.tier
  const length = Math.max(a.chain.length, b.chain.length)
  for (let index = 0; index < length; index += 1) {
    const left = a.chain[index] ?? -1
    const right = b.chain[index] ?? -1
    if (left !== right) return right - left
  }
  return 0
}

export type AuthzSession = {
  readonly domainId: number
  readonly actor: AuthzActor
  /** Authority bypass for platform/owner/admin; null when none applies. */
  readonly authority: { kind: 'platform' | 'owner' | 'admin' | 'personal-owner' } | null
  /** Validated User->Character tuple; null without an active member Character. */
  readonly characterState: { characterId: number; membershipId: number } | null
  /** All Domain Roles (for senior-role descendant matching). */
  readonly roles: RoleNode[]
  /** Strictly active Role assignments held by the acting Character. */
  readonly heldRoleIds: number[]
  /** Every active rule in the Domain, indexed by capability. */
  readonly rulesByCapability: Map<Capability, RuleRow[]>
  /** Folder/Department/Domain ancestry metadata, id -> node. */
  readonly folders: Map<number, { id: number; parentId: number | null; subdomainId: number | null }>
  readonly subdomains: Map<number, { id: number }>
  /** Documents with exception rules (Document-scope rules exist for them). */
  readonly documentExceptions: Map<number, RuleRow[]>
}

type FindAllArgs = { collection: string; where: Record<string, unknown>; depth?: number; req?: { transactionID?: number | string } }
type FindAll = <T>(args: FindAllArgs) => Promise<{ docs: T[] }>

/**
 * Load the reusable facts for one (User, Character, Domain) in a bounded number
 * of statements (currently 8: user, domain, domain-admins, characters-tuple,
 * roles, assignments, rules, folder/subdomain metadata). All reads use
 * overrideAccess — this loader IS the authorization boundary (same contract as
 * the interim evaluator it replaces).
 */
async function loadFacts(payload: Payload, actor: AuthzActor, domainId: number, transactionID?: number | string | null) {
  const txReq = transactionID == null ? undefined : { transactionID }
  // Payload's default `find` limit is intentionally finite. Authorization
  // inputs are correctness-critical, so the session loader must opt into the
  // unbounded form explicitly rather than relying on an implicit default.
  const find: FindAll = async <T>(args: FindAllArgs) => payload.find({ ...args, limit: 0, pagination: false } as never) as unknown as Promise<{ docs: T[] }>
  const [user, domain] = await Promise.all([
    payload.findByID({ collection: 'users', id: actor.userId, depth: 0, overrideAccess: true, req: txReq }).catch(() => null),
    payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true, req: txReq }).catch(() => null),
  ])
  if (!domain) throw new Error('Resource not found.')
  // P07X-T02: the acting Character tuple (active + controlled by the caller)
  // is resolved ONCE here and drives the authority decision. Administrative
  // authority comes from the Character's kind, never from User flags,
  // ownerUser, or legacy domain-admins rows. domain_admin Characters have no
  // DomainMembership by invariant, so their membership rows stay empty while
  // their scope authority still applies.
  let characterRecord: ({ status?: unknown; kind?: unknown; administrativeDomain?: unknown; controlledBy?: unknown } & Record<string, unknown>) | null = null
  let membershipRows: { docs: unknown[] } = { docs: [] }
  if (actor.activeCharacterId != null) {
    const [character, memberships] = await Promise.all([
      payload.findByID({ collection: 'characters', id: actor.activeCharacterId as number | string, depth: 0, overrideAccess: true, req: txReq }).catch(() => null),
      find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: actor.activeCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, req: txReq }),
    ])
    const candidate = character as ({ status?: unknown; kind?: unknown; administrativeDomain?: unknown; controlledBy?: unknown } & Record<string, unknown>) | null
    // A Character selector is a User -> Character tuple, not a caller-supplied
    // ID; the ownership check prevents forging another user's identity.
    if (candidate && candidate.status === 'active') {
      const hasControllerField = Object.prototype.hasOwnProperty.call(candidate, 'controlledBy')
      const controllerId = idOf(candidate.controlledBy)
      const validTuple = (!hasControllerField || controllerId != null) && (controllerId == null || controllerId === Number(actor.userId))
      if (validTuple) {
        characterRecord = candidate
        membershipRows = memberships
      }
    }
  }
  const [rolesResult, assignmentsResult, rulesResult, foldersResult, subdomainsResult] = await Promise.all([
    find({ collection: 'roles', where: { domain: { equals: domainId } }, depth: 0, req: txReq }),
    actor.activeCharacterId == null ? Promise.resolve({ docs: [] }) : find({ collection: 'role-assignments', where: { and: [{ character: { equals: actor.activeCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, req: txReq }),
    find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { active: { equals: true } }] }, depth: 1, req: txReq }),
    find({ collection: 'folders', where: { domain: { equals: domainId } }, depth: 0, req: txReq }),
    find({ collection: 'subdomains', where: { domain: { equals: domainId } }, depth: 0, req: txReq }),
  ])

  const roles: RoleNode[] = (rolesResult.docs as unknown as Record<string, unknown>[]).map((role) => ({
    id: Number(role.id),
    domainId: Number(idOf(role.domain)),
    departmentId: Number(idOf(role.subdomain)),
    parentId: idOf(role.parentRole),
    active: Boolean(role.active),
  }))

  const rulesByCapability = new Map<Capability, RuleRow[]>()
  const documentExceptions = new Map<number, RuleRow[]>()
  for (const raw of rulesResult.docs as unknown as Record<string, unknown>[]) {
    const principalType = String(raw.principalType ?? '') as PrincipalType
    const resourceType = String(raw.resourceType ?? '') as ResourceType
    if (!(relationForPrincipal[principalType] && relationForResource[resourceType])) continue
    const principal = polymorphic(raw.principal)
    const resource = polymorphic(raw.resource)
    if (principal.relationTo !== relationForPrincipal[principalType] || resource.relationTo !== relationForResource[resourceType]) continue
    if (principal.id == null || resource.id == null) continue
    const capability = String(raw.capability) as Capability
    const effect = String(raw.effect) === 'deny' ? 'deny' : 'grant'
    const rule: RuleRow = { id: raw.id as number | string, capability, effect, principalType, principalId: principal.id, resourceType, resourceId: resource.id }
    const bucket = rulesByCapability.get(capability) ?? []
    bucket.push(rule)
    rulesByCapability.set(capability, bucket)
    if (resourceType === 'Document') {
      const exceptions = documentExceptions.get(resource.id) ?? []
      exceptions.push(rule)
      documentExceptions.set(resource.id, exceptions)
    }
  }

  // Owner decision 2026-09-04: no arbitrary caps on authorization inputs —
  // every fetch below the Payload boundary uses unbounded pagination.
  const folders = new Map((foldersResult.docs as unknown as Record<string, unknown>[]).map((folder) => {
    const id = Number(folder.id)
    return [id, { id, parentId: idOf(folder.parent), subdomainId: idOf(folder.subdomain) }]
  }))
  const subdomains = new Map((subdomainsResult.docs as unknown as Record<string, unknown>[]).map((subdomain) => [Number(subdomain.id), { id: Number(subdomain.id) }]))

  const domainRow = domain as unknown as { ownerUser?: unknown; ownerCharacter?: unknown; kind?: unknown }
  // P07X-T02 authority resolution — kind-driven, no ambient User authority:
  // - domain_admin whose administrativeDomain equals the selected Domain
  //   (controller equality with the Domain ownerUser is a T01 provisioning
  //   invariant, so the validated tuple is sufficient) -> full Domain
  //   customer-operational authority in exactly that Domain;
  // - Personal Domain owner Character -> personal-owner authority;
  // - platform_admin / player / npc / no Character -> NO Domain authority;
  //   platform work uses the separate authorizePlatformOperation seam.
  const characterKind = String(characterRecord?.kind ?? 'player')
  const characterAdminDomainId = characterRecord == null ? null : idOf(characterRecord.administrativeDomain)
  const authority = characterRecord != null && String(domainRow.kind) === 'personal' && idOf(domainRow.ownerCharacter) === Number(actor.activeCharacterId) && characterKind !== 'domain_admin' && characterKind !== 'platform_admin'
    ? { kind: 'personal-owner' as const }
    : characterRecord != null && characterKind === 'domain_admin' && characterAdminDomainId === domainId
      ? { kind: 'admin' as const }
      : null

  const membership = (membershipRows.docs as unknown as Record<string, unknown>[])[0]
  const characterState = membership && actor.activeCharacterId != null
    ? { characterId: Number(actor.activeCharacterId), membershipId: Number(idOf(membership.id)) }
    : null

  const heldRoleIds = (assignmentsResult.docs as unknown as Record<string, unknown>[])
    .map((assignment) => idOf(assignment.role))
    .filter((id): id is number => id != null && roles.some((role) => role.id === id && role.active))

  return { authority, characterState, roles, heldRoleIds, rulesByCapability, documentExceptions, folders, subdomains, domain }
}

/**
 * Resolve the ancestry chain of folder IDs from the folder to the Domain root
 * using ONLY in-memory metadata (no per-ancestor SQL). Returns the folder
 * itself plus every ancestor; an unknown parent terminates the walk, and
 * cycles terminate by visited-set. Subdomain keeps the FIRST non-null value
 * walking self-upward, matching the interim evaluator's `nodes.find()` order.
 */
export function folderAncestry(session: AuthzSession, folderId: number): { chain: number[]; subdomainId: number | null } {
  const chain: number[] = []
  const visited = new Set<number>()
  let cursor: number | null = folderId
  let subdomainId: number | null = null
  while (cursor != null && !visited.has(cursor)) {
    visited.add(cursor)
    chain.push(cursor)
    const node = session.folders.get(cursor)
    if (!node) break
    if (subdomainId == null && node.subdomainId != null) subdomainId = node.subdomainId
    cursor = node.parentId
  }
  return { chain, subdomainId }
}

/**
 * Resolve a Document decision target from its already-known folder/subdomain
 * columns. The document's own subdomain wins over the nearest ancestor
 * folder's, matching the interim evaluator's node order. folderChain is the
 * document's folder ancestry (folder first), computed in-memory.
 */
export function resolveDocumentTarget(session: AuthzSession, document: { id: number; folderId: number | null; subdomainId: number | null }): { type: 'Document'; id: number; folderChain: number[]; subdomainId: number | null } {
  const ancestry = document.folderId == null ? { chain: [], subdomainId: null } : folderAncestry(session, document.folderId)
  return { type: 'Document', id: document.id, folderChain: document.folderId == null ? [] : [document.folderId, ...ancestry.chain], subdomainId: document.subdomainId ?? ancestry.subdomainId }
}

/**
 * Compute the lexicographic specificity of a rule resource relative to a
 * target's resolved ancestry. Tier 0 = Document, 1 = Folder, 2 = Subdomain,
 * 3 = Domain. Folder chain position is its distance from the target: a rule
 * on the target's own folder is more specific than one on an ancestor.
 */
export function ruleSpecificity(session: AuthzSession, target: { type: ResourceType; id: number; folderChain?: number[]; subdomainId?: number | null }, rule: RuleRow): Specificity | null {
  if (rule.resourceType === 'Document') {
    return rule.resourceId === target.id && target.type === 'Document' ? { tier: 0, chain: [rule.resourceId] } : null
  }
  if (target.type === 'Domain') {
    return rule.resourceType === 'Domain' && rule.resourceId === target.id ? { tier: 3, chain: [] } : null
  }
  if (target.type === 'Document') {
    // Document target: Document rules match directly; Folder/Department/Domain
    // rules match through the document's folder ancestry.
    if (rule.resourceType === 'Folder') {
      const chain = target.folderChain ?? []
      const position = chain.indexOf(rule.resourceId)
      return position === -1 ? null : { tier: 1, chain: [position] }
    }
    if (rule.resourceType === 'Subdomain') return rule.resourceId === target.subdomainId ? { tier: 2, chain: [] } : null
    return rule.resourceType === 'Domain' && rule.resourceId === session.domainId ? { tier: 3, chain: [] } : null
  }
  if (target.type === 'Folder') {
    if (rule.resourceType === 'Folder') {
      const position = (target.folderChain ?? []).indexOf(rule.resourceId)
      return position === -1 ? null : { tier: 1, chain: [position] }
    }
    if (rule.resourceType === 'Subdomain') return rule.resourceId === target.subdomainId ? { tier: 2, chain: [] } : null
    return rule.resourceType === 'Domain' && rule.resourceId === session.domainId ? { tier: 3, chain: [] } : null
  }
  if (target.type === 'Subdomain') {
    if (rule.resourceType === 'Subdomain') return rule.resourceId === target.id ? { tier: 2, chain: [] } : null
    return rule.resourceType === 'Domain' && rule.resourceId === session.domainId ? { tier: 3, chain: [] } : null
  }
  return null
}

function ruleMatchesPrincipal(session: AuthzSession, rule: RuleRow): boolean {
  if (rule.principalType === 'User') return rule.principalId === Number(session.actor.userId)
  if (rule.principalType === 'Character') return session.characterState != null && rule.principalId === session.characterState.characterId
  if (rule.principalType === 'Role') {
    if (session.characterState == null) return false
    return roleMatchesHeldRoleInSession(rule.principalId, session.heldRoleIds, session.roles)
  }
  return session.characterState != null && rule.principalId === session.characterState.membershipId
}

function roleMatchesHeldRoleInSession(ruleRoleId: number, heldRoleIds: number[], roles: RoleNode[]): boolean {
  const byId = new Map(roles.map((role) => [role.id, role]))
  return heldRoleIds.some((held) => {
    if (ruleRoleId === held) return true
    // A held senior Role inherits defaults and authority from its strict
    // subordinate Roles. Walk the rule Role upward until it reaches the held
    // Role; walking from the held Role downward would incorrectly grant a
    // clerk the Head Scribe's delegation rule.
    let cursor = byId.get(ruleRoleId)
    const visited = new Set<number>()
    while (cursor?.parentId !== null && cursor?.parentId !== undefined) {
      if (visited.has(cursor.id)) return false
      visited.add(cursor.id)
      if (cursor.parentId === held) return true
      cursor = byId.get(cursor.parentId)
    }
    return false
  })
}

export type SessionDecision = { allowed: boolean; reason: string; matchedRule?: { id: number | string; effect: 'grant' | 'deny'; principalType: PrincipalType; resourceType: ResourceType; resourceId: number; specificity: Specificity }; trace: string[] }

/**
 * Pure decision over preloaded facts — ZERO SQL. Frozen semantics:
 * direct User/Character peers > Role > membership; within each tier
 * Document > deepest Folder > Department > Domain; deny on equal specificity;
 * more-specific direct grant overrides broader direct deny; Role grant cannot
 * override an applicable direct deny.
 */
export function decideInSession(session: AuthzSession, capability: Capability, target: { type: ResourceType; id: number; folderChain?: number[]; subdomainId?: number | null }): SessionDecision {
  if (session.authority) {
    // P07X-T02: 'platform'/'owner' kinds are unreachable here (platform work
    // uses authorizePlatformOperation; ownerUser authority requires the
    // provisioned domain_admin identity, which resolves as 'admin').
    const reason = session.authority.kind === 'platform' ? 'Platform Admin bypass.' : session.authority.kind === 'owner' ? 'Community Domain Owner authority.' : session.authority.kind === 'personal-owner' ? 'Personal Domain owner Character authority.' : 'Acting Domain Admin authority (Administrator of this Domain).'
    return { allowed: true, reason, trace: [reason] }
  }
  if (session.characterState == null) return { allowed: false, reason: 'An active member Character is required.', trace: ['No active Character/Domain membership tuple.'] }
  const rules = session.rulesByCapability.get(capability) ?? []
  type Candidate = { rule: RuleRow; classRank: number; specificity: Specificity }
  const candidates: Candidate[] = []
  for (const rule of rules) {
    const specificity = ruleSpecificity(session, target, rule)
    if (!specificity) continue
    if (!ruleMatchesPrincipal(session, rule)) continue
    let classRank: number
    if (rule.principalType === 'User' || rule.principalType === 'Character') classRank = 3
    else if (rule.principalType === 'Role') classRank = 2
    else classRank = 1
    candidates.push({ rule, classRank, specificity })
  }
  if (candidates.length === 0) return { allowed: false, reason: 'No matching grant.', trace: ['No applicable rule; default deny.'] }
  candidates.sort((a, b) => b.classRank - a.classRank || specificitiesCompare(b.specificity, a.specificity) || (a.rule.effect === 'deny' ? -1 : 1))
  const winner = candidates[0]
  const winnerText = `${winner.rule.effect} via ${winner.rule.principalType} on ${winner.rule.resourceType} ${winner.rule.resourceId} (${winner.specificity.tier}/${winner.specificity.chain.join(',')})`
  return {
    allowed: winner.rule.effect === 'grant',
    reason: winner.rule.effect === 'grant' ? `Allowed: ${winnerText}.` : `Denied: ${winnerText}.`,
    matchedRule: { id: winner.rule.id, effect: winner.rule.effect, principalType: winner.rule.principalType, resourceType: winner.rule.resourceType, resourceId: winner.rule.resourceId, specificity: winner.specificity },
    trace: [winnerText, ...candidates.slice(1).map((candidate) => `${candidate.rule.effect} via ${candidate.rule.principalType} on ${candidate.rule.resourceType} ${candidate.rule.resourceId} (${candidate.specificity.tier}/${candidate.specificity.chain.join(',')})`)],
  }
}

/**
 * Load the session for a request. In React Server Component context use
 * loadCachedAuthorizationSession (request-local memoization); explicit
 * dependency passing (this function) everywhere else.
 */
export async function loadAuthorizationSession(payload: Payload, actor: AuthzActor, domainId: number | string, options?: { transactionID?: number | string | null }): Promise<AuthzSession> {
  const domain = Number(domainId)
  if (!Number.isInteger(domain)) throw new Error('Invalid Domain.')
  const facts = await loadFacts(payload, actor, domain, options?.transactionID)
  return { domainId: domain, actor, ...facts }
}

/** Decide many (capability, resource) pairs with zero SQL after preload. */
export function decideManyInSession(session: AuthzSession, requests: Array<{ capability: Capability; resource: AuthzResourceRef }>): SessionDecision[] {
  return requests.map((request) => {
    let target: { type: ResourceType; id: number; folderChain?: number[]; subdomainId?: number | null }
    if (request.resource.type === 'Document') {
      target = { type: 'Document', id: Number(request.resource.id) }
    } else if (request.resource.type === 'Folder') {
      const ancestry = folderAncestry(session, Number(request.resource.id))
      target = { type: 'Folder', id: Number(request.resource.id), folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }
    } else if (request.resource.type === 'Subdomain') {
      target = { type: 'Subdomain', id: Number(request.resource.id) }
    } else {
      target = { type: 'Domain', id: session.domainId }
    }
    return decideInSession(session, request.capability, target)
  })
}

/** Convenience single-shot decision against a preloaded session. */
export function decideOne(session: AuthzSession, capability: Capability, resource: AuthzResourceRef): SessionDecision {
  return decideManyInSession(session, [{ capability, resource }])[0]
}

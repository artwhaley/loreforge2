import type { Payload } from 'payload'

import { isCapability, type Capability, type PrincipalType, type ResourceType } from '@/lib/permissions/capabilities'
import { resolveResourceTree, resourceSpecificity, type ResourceRef } from './resourceTree'
import { getRoleTree, roleMatchesHeldRole, type RoleNode } from './roleTree'

export type PermissionActor = { userId: number | string; activeCharacterId?: number | string | null }
export type PermissionDecision = { allowed: boolean; reason: string; matchedRule?: { id: number | string; effect: 'grant' | 'deny'; principalType: PrincipalType; resourceType: ResourceType; resourceId: number; specificity: number }; trace: string[] }

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

async function domainAuthority(payload: Payload, actor: PermissionActor, domainId: number): Promise<{ kind: 'platform' | 'owner' | 'admin' | 'personal-owner' | null; reason?: string }> {
  const [user, domain] = await Promise.all([
    payload.findByID({ collection: 'users', id: actor.userId, depth: 0, overrideAccess: true }).catch(() => null),
    payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true }).catch(() => null),
  ])
  if (!domain) return { kind: null }
  if (Boolean((user as { isPlatformAdmin?: unknown } | null)?.isPlatformAdmin)) return { kind: 'platform', reason: 'Platform Admin bypass.' }
  const ownerUserId = idOf((domain as { ownerUser?: unknown }).ownerUser)
  const ownerCharacterId = idOf((domain as { ownerCharacter?: unknown }).ownerCharacter)
  if (String(ownerUserId) === String(actor.userId)) return { kind: 'owner', reason: 'Community Domain Owner authority.' }
  if (String((domain as { kind?: unknown }).kind) === 'personal' && actor.activeCharacterId != null && ownerCharacterId === Number(actor.activeCharacterId)) return { kind: 'personal-owner', reason: 'Personal Domain owner Character authority.' }
  const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domainId } }, { user: { equals: actor.userId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (admins.docs.length > 0) return { kind: 'admin', reason: 'Operational Domain Admin authority.' }
  return { kind: null }
}

async function activeCharacterState(payload: Payload, actor: PermissionActor, domainId: number) {
  if (actor.activeCharacterId == null) return null
  const character = await payload.findByID({ collection: 'characters', id: actor.activeCharacterId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!character || character.status !== 'active') return null
  const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: actor.activeCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (!membership.docs[0]) return null
  return { characterId: Number(actor.activeCharacterId), membershipId: Number(membership.docs[0].id) }
}

function rulePrincipalId(rule: Record<string, unknown>): { type: PrincipalType | null; id: number | null; relation: string | null } {
  const type = String(rule.principalType ?? '') as PrincipalType
  if (!['Character', 'User', 'Role', 'DomainMembership'].includes(type)) return { type: null, id: null, relation: null }
  const value = polymorphic(rule.principal)
  return { type, id: value.id, relation: value.relationTo }
}

function ruleResourceId(rule: Record<string, unknown>): { type: ResourceType | null; id: number | null; relation: string | null } {
  const type = String(rule.resourceType ?? '') as ResourceType
  if (!['Domain', 'Subdomain', 'Folder', 'Document'].includes(type)) return { type: null, id: null, relation: null }
  const value = polymorphic(rule.resource)
  return { type, id: value.id, relation: value.relationTo }
}

/**
 * Single authoritative permission evaluator. It returns an explanation even
 * for denials so People and Folder-centered views can show the same result.
 */
export async function evaluatePermission(args: { payload: Payload; actor: PermissionActor; domainId: number | string; capability: string; resource: ResourceRef }): Promise<PermissionDecision> {
  const domainId = Number(args.domainId)
  if (!Number.isInteger(domainId) || !isCapability(args.capability)) return { allowed: false, reason: 'Invalid Domain or capability.', trace: [] }
  const capability = args.capability as Capability
  const authority = await domainAuthority(args.payload, args.actor, domainId)
  if (authority.kind) return { allowed: true, reason: authority.reason ?? 'Administrative authority.', trace: [authority.reason ?? 'Administrative authority.'] }
  const actorState = await activeCharacterState(args.payload, args.actor, domainId)
  if (!actorState) return { allowed: false, reason: 'An active member Character is required.', trace: ['No active Character/Domain membership tuple.'] }
  const tree = await resolveResourceTree(args.payload, args.resource)
  if (tree.domainId !== domainId) return { allowed: false, reason: 'Resource belongs to another Domain.', trace: ['Cross-Domain resource rejected.'] }
  const roles = await getRoleTree(args.payload, domainId)
  const assignments = await args.payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: actorState.characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 10000, overrideAccess: true })
  const heldRoleIds = assignments.docs.map((assignment) => Number(idOf(assignment.role))).filter((id) => Number.isFinite(id) && roles.some((role) => role.id === id && role.active))
  const rulesResult = await args.payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { capability: { equals: capability } }, { active: { equals: true } }] }, depth: 1, limit: 10000, overrideAccess: true })
  const candidates: Array<{ rule: Record<string, unknown>; classRank: number; specificity: number; principal: PrincipalType; resource: ResourceType; resourceId: number; effect: 'grant' | 'deny' }> = []
  for (const raw of rulesResult.docs) {
    const rule = raw as unknown as Record<string, unknown>
    const principal = rulePrincipalId(rule)
    const resource = ruleResourceId(rule)
    if (!principal.type || !resource.type || !principal.id || !resource.id) continue
    if (principal.relation !== relationForPrincipal[principal.type] || resource.relation !== relationForResource[resource.type]) continue
    const specificity = resourceSpecificity(tree.nodes, resource.type, resource.id)
    if (specificity < 0) continue
    let matches = false
    let classRank = 0
    if (principal.type === 'User') { matches = Number(principal.id) === Number(args.actor.userId); classRank = 3 }
    else if (principal.type === 'Character') { matches = Number(principal.id) === actorState.characterId; classRank = 3 }
    else if (principal.type === 'Role') { matches = roleMatchesHeldRole(Number(principal.id), heldRoleIds, roles); classRank = 2 }
    else { matches = Number(principal.id) === actorState.membershipId; classRank = 1 }
    if (!matches) continue
    const effect = String(rule.effect) === 'deny' ? 'deny' : 'grant'
    candidates.push({ rule, classRank, specificity, principal: principal.type, resource: resource.type, resourceId: Number(resource.id), effect })
  }
  if (candidates.length === 0) return { allowed: false, reason: 'No matching grant.', trace: ['No applicable rule; default deny.'] }
  candidates.sort((a, b) => b.classRank - a.classRank || b.specificity - a.specificity || (a.effect === 'deny' ? -1 : 1))
  const winner = candidates[0]
  const winnerText = `${winner.effect} via ${winner.principal} on ${winner.resource} ${winner.resourceId} (specificity ${winner.specificity})`
  return { allowed: winner.effect === 'grant', reason: winner.effect === 'grant' ? `Allowed: ${winnerText}.` : `Denied: ${winnerText}.`, matchedRule: { id: winner.rule.id as number | string, effect: winner.effect, principalType: winner.principal, resourceType: winner.resource, resourceId: winner.resourceId, specificity: winner.specificity }, trace: [winnerText, ...candidates.slice(1).map((candidate) => `${candidate.effect} via ${candidate.principal} on ${candidate.resource} ${candidate.resourceId} (specificity ${candidate.specificity})`)] }
}

export async function explainPermission(args: Parameters<typeof evaluatePermission>[0]) { return evaluatePermission(args) }

export async function requirePermission(args: Parameters<typeof evaluatePermission>[0]): Promise<PermissionDecision> {
  const decision = await evaluatePermission(args)
  if (!decision.allowed) throw new Error(decision.reason)
  return decision
}

export async function isAllowed(args: Parameters<typeof evaluatePermission>[0]): Promise<boolean> { return (await evaluatePermission(args)).allowed }


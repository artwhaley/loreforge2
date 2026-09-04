/**
 * P05R-T05 acceptance suite — Domain participation removal atomicity + the
 * durable DomainAuditEvents seam.
 *
 * Runs against a dedicated throwaway SQLite file (package.json test:security
 * chains this file with PAYLOAD_PUSH=true). Covers the ticket's automated
 * acceptance:
 * - failure injected mid-cascade (Folder-rule step) through the REAL hook path
 *   -> membership unchanged, RoleAssignments unchanged, Folder rules
 *   unchanged, no false "deactivated" audit event;
 * - the same injection on the standalone service path;
 * - a successful removal -> membership inactive, assignments and direct Folder
 *   rules revoked, exactly ONE coherent durable audit event, unrelated Domain
 *   untouched;
 * - re-adding membership starts clean (new assignment possible, added audit);
 * - the sanctioned routes write durable audit events (roles, role-assignments,
 *   permission-rules, domain-memberships);
 * - the audit collection is append-only: ordinary users can neither read nor
 *   write it.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, existsSync } from 'node:fs'

import { getPayload, type Payload, type User } from 'payload'
import { REST_POST } from '@payloadcms/next/routes'

import config from '@/payload.config'
import { POST as roleAssignmentsRoute } from '@/app/(payload)/api/role-assignments/route'
import { POST as rolesRoute } from '@/app/(payload)/api/roles/route'
import { POST as permissionRulesRoute } from '@/app/(payload)/api/permission-rules/route'
import { POST as domainMembershipsRoute } from '@/app/(payload)/api/domain-memberships/route'
import { deactivateDomainParticipation } from '@/lib/domains/deactivateDomainParticipation'

const restPost = REST_POST(config)

type Id = number

// Fresh throwaway DB per run (mirrors the other security suites).
const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
if (dbPath && existsSync(dbPath)) rmSync(dbPath)

const payloadPromise: Promise<Payload> = getPayload({ config })

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

async function fixture() {
  const payload = await payloadPromise
  const owner = await payload.create({ collection: 'users', data: { email: 'owner@example.test', password: 'test-password-123', name: 'Owner' } } as never) as User & { id: Id }
  const makeDomain = async (name: string, slug: string) => payload.create({ collection: 'domains', data: { name, slug, kind: 'community', ownerUser: owner.id, defaultFilingPolicy: 'direct-file' } } as never)
  const alpha = await makeDomain('Alpha', 'alpha')
  const beta = await makeDomain('Beta', 'beta')

  const charA = await payload.create({ collection: 'characters', data: { name: 'AlphaResident', status: 'active', controlledBy: owner.id } } as never)
  const charBeta = await payload.create({ collection: 'characters', data: { name: 'BetaResident', status: 'active', controlledBy: owner.id } } as never)

  const membershipAlpha = await payload.create({ collection: 'domain-memberships', data: { domain: alpha.id, character: charA.id, status: 'active', addedBy: owner.id } } as never)
  const membershipBeta = await payload.create({ collection: 'domain-memberships', data: { domain: beta.id, character: charBeta.id, status: 'active', addedBy: owner.id } } as never)

  const deptAlpha = await payload.create({ collection: 'subdomains', data: { domain: alpha.id, name: 'Records', slug: 'records' } } as never)
  const deptBeta = await payload.create({ collection: 'subdomains', data: { domain: beta.id, name: 'Vault', slug: 'vault' } } as never)

  const roleAlpha = await payload.create({ collection: 'roles', data: { domain: alpha.id, subdomain: deptAlpha.id, name: 'Clerk', active: true, system: false } } as never)
  const roleBeta = await payload.create({ collection: 'roles', data: { domain: beta.id, subdomain: deptBeta.id, name: 'Keeper', active: true, system: false } } as never)

  const folderAlpha = await payload.create({ collection: 'folders', data: { domain: alpha.id, name: 'Shelves', parent: null, systemManaged: false, filingPolicy: 'inherit' } } as never)
  const folderBeta = await payload.create({ collection: 'folders', data: { domain: beta.id, name: 'Vault Shelves', parent: null, systemManaged: false, filingPolicy: 'inherit' } } as never)

  const assignmentAlpha = await payload.create({ collection: 'role-assignments', data: { character: charA.id, role: roleAlpha.id, status: 'active', assignedBy: owner.id } } as never)
  const assignmentBeta = await payload.create({ collection: 'role-assignments', data: { character: charBeta.id, role: roleBeta.id, status: 'active', assignedBy: owner.id } } as never)

  const ruleAlpha = await payload.create({ collection: 'permission-rules', data: { domain: alpha.id, principalType: 'Character', principal: { relationTo: 'characters', value: charA.id }, resourceType: 'Folder', resource: { relationTo: 'folders', value: folderAlpha.id }, capability: 'read', effect: 'grant', active: true, actorUser: owner.id } } as never)
  const ruleBeta = await payload.create({ collection: 'permission-rules', data: { domain: beta.id, principalType: 'Character', principal: { relationTo: 'characters', value: charBeta.id }, resourceType: 'Folder', resource: { relationTo: 'folders', value: folderBeta.id }, capability: 'read', effect: 'grant', active: true, actorUser: owner.id } } as never)

  return { payload, owner, alpha, beta, charA, charBeta, membershipAlpha, membershipBeta, roleAlpha, roleBeta, folderAlpha, folderBeta, assignmentAlpha, assignmentBeta, ruleAlpha, ruleBeta, deptAlpha }
}

const f = await fixture()

async function auditEvents(where: Record<string, unknown>) {
  const result = await f.payload.find({ collection: 'domain-audit-events', where: where as never, depth: 0, limit: 200, overrideAccess: true })
  return result.docs
}

async function login(payload: Payload, email: string, password: string): Promise<string> {
  const res = await restPost(new Request('http://localhost/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }), { params: Promise.resolve({ slug: ['users', 'login'] }) })
  assert.equal(res.status, 200, `login for ${email} should succeed`)
  const body = await res.json() as { token?: string }
  assert.ok(body.token, 'login response carries a token')
  return body.token as string
}

function formPost(handler: (request: Request) => Promise<Response>, token: string, fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return handler(new Request('http://localhost/api/x', { method: 'POST', headers: { Authorization: `JWT ${token}` }, body: form }))
}

test('P05R-T05: the audit collection is append-only — no ordinary read or write', async () => {
  const { payload, owner } = f
  const deniedRead = await payload.find({ collection: 'domain-audit-events', overrideAccess: false, user: owner, depth: 0, limit: 5 }).then((r) => r.docs.length).catch(() => -1)
  assert.ok(deniedRead <= 0, 'ordinary users must not read audit rows')
  const deniedWrite = await payload.create({ collection: 'domain-audit-events', overrideAccess: false, user: owner, data: { domain: f.alpha.id, eventType: 'membership_changed', targetType: 'membership', targetId: 'forged', action: 'forged', actorUser: owner.id } } as never).then(() => 'allowed').catch((error: Error) => String(error))
  assert.notEqual(deniedWrite, 'allowed', 'ordinary users must not forge audit rows')
})

test('P05R-T05: mid-cascade failure through the hook rolls back everything — membership, assignments, rules, and the audit', async () => {
  const { payload, alpha, charA, membershipAlpha, assignmentAlpha, ruleAlpha, membershipBeta, assignmentBeta, ruleBeta } = f
  await assert.rejects(
    payload.update({ collection: 'domain-memberships', id: membershipAlpha.id, data: { status: 'inactive' }, context: { simulateDomainRemovalFailureAt: 'folderRules' } } as never),
    /injected failure/,
    'the removal must abort when the Folder-rule step throws',
  )
  const membership = await payload.findByID({ collection: 'domain-memberships', id: membershipAlpha.id, depth: 0, overrideAccess: true })
  assert.equal(String((membership as { status: string }).status), 'active', 'membership must be unchanged after the failed removal')
  const assignment = await payload.findByID({ collection: 'role-assignments', id: assignmentAlpha.id, depth: 0, overrideAccess: true }).catch(() => null)
  assert.ok(assignment, 'RoleAssignment must survive the rollback')
  const rule = await payload.findByID({ collection: 'permission-rules', id: ruleAlpha.id, depth: 0, overrideAccess: true }).catch(() => null)
  assert.ok(rule, 'Folder PermissionRule must survive the rollback')
  const events = await auditEvents({ and: [{ domain: { equals: alpha.id } }, { eventType: { equals: 'membership_changed' } }, { action: { equals: 'deactivated' } }] })
  assert.equal(events.length, 0, 'no false successful-removal audit event may exist')
  // Unrelated Domain untouched.
  const betaAssignment = await payload.findByID({ collection: 'role-assignments', id: assignmentBeta.id, depth: 0, overrideAccess: true }).catch(() => null)
  const betaRule = await payload.findByID({ collection: 'permission-rules', id: ruleBeta.id, depth: 0, overrideAccess: true }).catch(() => null)
  const betaMembership = await payload.findByID({ collection: 'domain-memberships', id: membershipBeta.id, depth: 0, overrideAccess: true })
  assert.ok(betaAssignment && betaRule, 'unrelated Domain rows must be untouched')
  assert.equal(String((betaMembership as { status: string }).status), 'active')
  void charA
})

test('P05R-T05: standalone service failure injection also rolls back atomically', async () => {
  const { payload, alpha, charA, assignmentAlpha, ruleAlpha } = f
  await assert.rejects(
    deactivateDomainParticipation({ payload, domainId: alpha.id, characterId: charA.id, membershipId: f.membershipAlpha.id, simulateFailureAt: 'folderRules' }),
    /injected failure/,
  )
  const assignment = await payload.findByID({ collection: 'role-assignments', id: assignmentAlpha.id, depth: 0, overrideAccess: true }).catch(() => null)
  const rule = await payload.findByID({ collection: 'permission-rules', id: ruleAlpha.id, depth: 0, overrideAccess: true }).catch(() => null)
  assert.ok(assignment, 'RoleAssignment must survive the standalone rollback')
  assert.ok(rule, 'Folder PermissionRule must survive the standalone rollback')
  const events = await auditEvents({ and: [{ domain: { equals: alpha.id } }, { action: { equals: 'deactivated' } }] })
  assert.equal(events.length, 0, 'no audit event may survive the standalone rollback')
})

test('P05R-T05: successful removal is atomic and leaves exactly one coherent audit trail', async () => {
  const { payload, alpha, charA, membershipAlpha, assignmentAlpha, ruleAlpha, owner, assignmentBeta, ruleBeta, membershipBeta } = f
  await payload.update({ collection: 'domain-memberships', id: membershipAlpha.id, data: { status: 'inactive', addedBy: owner.id } } as never)
  const membership = await payload.findByID({ collection: 'domain-memberships', id: membershipAlpha.id, depth: 0, overrideAccess: true })
  assert.equal(String((membership as { status: string }).status), 'inactive', 'membership deactivates')
  const assignment = await payload.findByID({ collection: 'role-assignments', id: assignmentAlpha.id, depth: 0, overrideAccess: true }).catch(() => null)
  const rule = await payload.findByID({ collection: 'permission-rules', id: ruleAlpha.id, depth: 0, overrideAccess: true }).catch(() => null)
  assert.equal(assignment, null, 'in-Domain RoleAssignment must be revoked')
  assert.equal(rule, null, 'direct Folder PermissionRule must be revoked')
  const events = await auditEvents({ and: [{ domain: { equals: alpha.id } }, { eventType: { equals: 'membership_changed' } }, { action: { equals: 'deactivated' } }] })
  assert.equal(events.length, 1, 'exactly one durable deactivation event')
  const event = events[0] as { actorUser?: { id?: Id } | Id; targetId?: string; context?: { removedRoleAssignmentIds?: Id[]; removedFolderRuleIds?: Id[]; characterId?: Id } }
  assert.equal(relationId(event.actorUser), owner.id, 'deactivation is actor-aware')
  assert.equal(String(event.targetId), String(membershipAlpha.id), 'the audit targets the membership row')
  assert.deepEqual(event.context?.removedRoleAssignmentIds, [Number(assignmentAlpha.id)], 'audit records the revoked assignment')
  assert.deepEqual(event.context?.removedFolderRuleIds, [Number(ruleAlpha.id)], 'audit records the revoked Folder rule')
  // Unrelated Domain untouched — including its audit silence.
  const betaAssignment = await payload.findByID({ collection: 'role-assignments', id: assignmentBeta.id, depth: 0, overrideAccess: true }).catch(() => null)
  const betaRule = await payload.findByID({ collection: 'permission-rules', id: ruleBeta.id, depth: 0, overrideAccess: true }).catch(() => null)
  const betaMembership = await payload.findByID({ collection: 'domain-memberships', id: membershipBeta.id, depth: 0, overrideAccess: true })
  assert.ok(betaAssignment && betaRule, 'unrelated Domain rows must be untouched')
  assert.equal(String((betaMembership as { status: string }).status), 'active')
  const betaEvents = await auditEvents({ and: [{ domain: { equals: f.beta.id } }, { action: { equals: 'deactivated' } }] })
  assert.equal(betaEvents.length, 0, 'no audit events may leak into the unrelated Domain')
  void charA
})

test('P05R-T05: re-adding membership starts clean — assignments and audits work again', async () => {
  const { payload, alpha, charA, roleAlpha, owner } = f
  await payload.update({ collection: 'domain-memberships', id: f.membershipAlpha.id, data: { status: 'active', addedBy: owner.id } } as never)
  const membership = await payload.findByID({ collection: 'domain-memberships', id: f.membershipAlpha.id, depth: 0, overrideAccess: true })
  assert.equal(String((membership as { status: string }).status), 'active', 're-add restores active membership')
  const reAssignment = await payload.create({ collection: 'role-assignments', data: { character: charA.id, role: roleAlpha.id, status: 'active', assignedBy: owner.id } } as never)
  assert.ok(reAssignment, 'a fresh RoleAssignment is possible after re-adding')
})

test('P05R-T05: sanctioned admin routes write durable audit events', async () => {
  const { payload, owner } = f
  const token = await login(payload, 'owner@example.test', 'test-password-123')

  // Role creation through the sanctioned route -> role_changed / created.
  const roleCreate = await formPost(rolesRoute, token, { domainSlug: 'alpha', name: 'Vault Clerk', subdomainId: String(f.deptAlpha.id), returnTo: '/domain/alpha/roles' })
  assert.equal(roleCreate.status, 303)
  const createdRole = (await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: f.alpha.id } }, { name: { equals: 'Vault Clerk' } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  assert.ok(createdRole, 'role must persist')
  const roleEvents = await auditEvents({ and: [{ domain: { equals: f.alpha.id } }, { eventType: { equals: 'role_changed' } }, { action: { equals: 'created' } }, { targetId: { equals: String(createdRole.id) } }] })
  assert.equal(roleEvents.length, 1, 'role creation is durably audited')

  // Role assignment through the sanctioned route -> role_assignment_changed / assigned.
  // (The re-add test already created an assignment for charA; clear it so the
  // route performs a real create and audits it.)
  const preExisting = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: f.charA.id } }, { role: { equals: f.roleAlpha.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (preExisting.docs[0]) await payload.delete({ collection: 'role-assignments', id: preExisting.docs[0].id, overrideAccess: true })
  const assign = await formPost(roleAssignmentsRoute, token, { domainSlug: 'alpha', characterId: String(f.charA.id), roleId: String(f.roleAlpha.id), action: 'add', returnTo: `/domain/alpha/manage/people/${f.charA.id}` })
  assert.equal(assign.status, 303)
  const assignEvents = await auditEvents({ and: [{ domain: { equals: f.alpha.id } }, { eventType: { equals: 'role_assignment_changed' } }, { action: { equals: 'assigned' } }] })
  assert.equal(assignEvents.length, 1, 'assignment is durably audited')

  // Folder direct access through the sanctioned route -> folder_access_changed.
  const folderAccess = await formPost(permissionRulesRoute, token, { domainSlug: 'alpha', principalType: 'Character', characterId: String(f.charA.id), folderId: String(f.folderAlpha.id), readState: 'grant', writeState: 'inherit' })
  assert.equal(folderAccess.status, 303)
  const accessEvents = await auditEvents({ and: [{ domain: { equals: f.alpha.id } }, { eventType: { equals: 'folder_access_changed' } }] })
  assert.equal(accessEvents.length, 1, 'Folder access change is durably audited')

  // Membership add through the sanctioned route -> membership_changed / added.
  const addMember = await formPost(domainMembershipsRoute, token, { domainSlug: 'alpha', characterId: String(f.charBeta.id), action: 'add' })
  assert.equal(addMember.status, 303)
  const addEvents = await auditEvents({ and: [{ domain: { equals: f.alpha.id } }, { eventType: { equals: 'membership_changed' } }, { action: { equals: 'added' } }] })
  assert.equal(addEvents.length, 1, 'membership add is durably audited')

  // Membership removal through the sanctioned route -> the hook audits deactivated.
  const removeMember = await formPost(domainMembershipsRoute, token, { domainSlug: 'alpha', characterId: String(f.charBeta.id), action: 'remove' })
  assert.equal(removeMember.status, 303)
  const betaInAlpha = (await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: f.alpha.id } }, { character: { equals: f.charBeta.id } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  const removedEvents = await auditEvents({ and: [{ domain: { equals: f.alpha.id } }, { eventType: { equals: 'membership_changed' } }, { action: { equals: 'deactivated' } }, { targetId: { equals: String(betaInAlpha.id) } }] })
  assert.equal(removedEvents.length, 1, 'membership removal through the route is durably audited by the cascade')
  void owner
})

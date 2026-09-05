import assert from 'node:assert/strict'
import test from 'node:test'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedPhase7Acceptance } from '@/seed/phase7Acceptance'
import { isAllowed } from './evaluate'
import { canAssignRole, canCreateRole, assertCanDelegate } from './delegation'
import { canOpenPeople, folderControls } from './workspaces'
import { decideCharacterClaim } from '@/lib/characters/decideClaim'
import { canAccessDocument } from '@/lib/authorization/documentAccess'

if (!/^file:.*p7-acceptance-test-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a new p7-acceptance-test-*.db; never the working DB.')
const payload = await getPayload({ config })
const f = await seedPhase7Acceptance(payload)
const actor = (key: string) => ({ userId: f.users[key], activeCharacterId: f.characters[key] })
const domainId = f.domains.workshop
const folder = (key: string) => ({ type: 'Folder' as const, id: f.folders[key] })
const allowed = (key: string, capability: string, target: string) => isAllowed({ payload, actor: actor(key), domainId, capability, resource: folder(target) })

test('P7 real fixtures: subordinate assignment rejects self, peer, ancestor, inactive and other Department', async () => {
  for (const [who, targets] of [['head', ['deputy', 'clerk', 'helper', 'peer']], ['deputy', ['clerk', 'helper']]] as const) {
    for (const target of targets) assert.equal(await canAssignRole(payload, { actor: actor(who), domainId, targetRoleId: f.roles[target] }), true, `${who} -> ${target}`)
  }
  for (const [who, targets] of [['head', ['head', 'warrior', 'inactive']], ['deputy', ['head', 'deputy', 'peer', 'warrior', 'inactive']], ['member', ['head', 'helper']]] as const) {
    for (const target of targets) assert.equal(await canAssignRole(payload, { actor: actor(who), domainId, targetRoleId: f.roles[target] }), false, `${who} -> ${target}`)
  }
})

test('P7 delegated workspace entry does not grant Role creation or general administration', async () => {
  for (const who of ['head', 'deputy', 'access', 'roles']) assert.equal(await canOpenPeople(payload, actor(who), domainId), true)
  for (const who of ['member', 'folders', 'claimant']) assert.equal(await canOpenPeople(payload, actor(who), domainId), false)
  assert.equal(await canCreateRole(payload, { actor: actor('head'), domainId, departmentId: f.departments.Scribes }), false)
  assert.equal(await canCreateRole(payload, { actor: actor('roles'), domainId, departmentId: f.departments.Scribes }), true)
  assert.equal(await canCreateRole(payload, { actor: actor('roles'), domainId, departmentId: f.departments.Warriors }), false)
  assert.equal(await canCreateRole(payload, { actor: actor('folders'), domainId, departmentId: f.departments.Scribes }), false)
})

test('P7 scoped folders and access manager cannot escape scope or grant unpossessed Write', async () => {
  assert.equal(await allowed('folders', 'manage_folders', 'deedsChild'), true)
  for (const target of ['root', 'history', 'outside']) assert.equal(await allowed('folders', 'manage_folders', target), false)
  assert.deepEqual(await folderControls(payload, actor('access'), domainId, f.folders.deeds), { canManageAccess: true, canGrantRead: true, canGrantWrite: false })
  await assert.rejects(assertCanDelegate(payload, actor('access'), domainId, 'edit_document', folder('deeds')))
  await assert.rejects(assertCanDelegate(payload, actor('access'), domainId, 'read', folder('history'), 'deny'))
  assert.equal(await assertCanDelegate(payload, actor('access'), domainId, 'edit_document', folder('deeds'), 'deny'), true)
  assert.equal(await assertCanDelegate(payload, actor('access'), domainId, 'edit_document', folder('deeds'), 'revoke'), true)
})

test('P7 golden matrix: Commander, Captains, Warrior, cross-hierarchy exception, explicit deny and multi-role', async () => {
  const expected: Record<string, boolean[]> = {
    commander: [true, true, false, false], captain1: [true, false, false, false], captain2: [false, true, false, false],
    warrior: [false, false, true, true], denied: [false, false, false, false], multi: [false, false, true, true],
  }
  for (const [who, values] of Object.entries(expected)) {
    const actual = await Promise.all(['first', 'second', 'incidents', 'courts'].map((target) => allowed(who, 'read', target)))
    assert.deepEqual(actual, values, who)
  }
  assert.equal(await allowed('warrior', 'edit_document', 'courts'), false, 'direct court exception is Read only')
  assert.equal(await allowed('multi', 'edit_document', 'courts'), true, 'Magistrate supplies Write')
})

test('P7 ownership, platform exception and forged acting Character remain separate boundaries', async () => {
  assert.equal(await allowed('owner', 'read', 'outside'), false)
  assert.equal(await allowed('platform', 'read', 'outside'), false, 'even a platform user cannot mismatch resource and Domain')
  // P07X-T02: the platform User's ordinary Character is not an ambient Domain
  // record bypass — platform authority lives in the provisioned platform_admin
  // identity and the separate platform seam, never in ordinary record reads.
  assert.equal(await isAllowed({ payload, actor: actor('platform'), domainId: f.domains.outside, capability: 'read', resource: folder('outside') }), false, 'platform User identity is not Domain record authority (P07X-T02)')
  assert.equal(await isAllowed({ payload, actor: { userId: f.users.member, activeCharacterId: f.characters.head }, domainId, capability: 'manage_access', resource: folder('deeds') }), false)
})

test('P7 actual document access: readable is not writable; locked predecessor remains locked', async () => {
  assert.equal(await canAccessDocument({ payload, user: { id: f.users.member }, activeCharacterId: f.characters.member, documentId: f.documents.deed, capability: 'read' }), true)
  assert.equal(await canAccessDocument({ payload, user: { id: f.users.member }, activeCharacterId: f.characters.member, documentId: f.documents.deed, capability: 'update' }), false)
  assert.equal(await canAccessDocument({ payload, user: { id: f.users.head }, activeCharacterId: f.characters.head, documentId: f.documents.old, capability: 'update' }), false)
  assert.equal(await canAccessDocument({ payload, user: { id: f.users.owner }, activeCharacterId: f.characters.owner, documentId: f.documents.outside, capability: 'read' }), false)
})

test('P7 concurrent claim approval has exactly one winner and cannot rebind or spoof the target', async () => {
  const claims: Array<{ id: number }> = []
  for (const key of ['claimant', 'claimant2']) claims.push(await payload.create({ collection: 'character-claim-requests', data: { character: f.characters.raceTarget, claimant: f.users[key], domain: domainId, status: 'pending', requestedAt: new Date().toISOString() } }))
  const decide = (i: number, who = 'claims', characterId = f.characters.raceTarget) => decideCharacterClaim(payload, { actor: actor(who), domainId, characterId, claimId: claims[i].id, decision: 'approved' })
  assert.equal(await decide(0, 'member'), false)
  assert.equal(await decide(0, 'claims', f.characters.claimTarget), false)
  const outcomes = await Promise.all([decide(0), decide(1)])
  assert.equal(outcomes.filter(Boolean).length, 1)
  const before = await payload.findByID({ collection: 'characters', id: f.characters.raceTarget, depth: 0 })
  assert.equal(await decide(outcomes[0] ? 1 : 0), false)
  assert.equal((await payload.findByID({ collection: 'characters', id: before.id, depth: 0 })).controlledBy, before.controlledBy)
  const approved = await payload.findByID({ collection: 'character-claim-requests', id: claims[outcomes[0] ? 0 : 1].id, depth: 0 })
  assert.equal(approved.decidingCharacter, f.characters.claims)
})

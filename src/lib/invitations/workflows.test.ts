import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import test from 'node:test'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'

import { acceptCharacterInvitation, acceptDomainBootstrapInvitation, acceptDomainJoinInvitation, canManageDomainInvitations, createSetupPendingDomain, decideDomainBootstrapRequest, decideDomainJoinRequest, issueCharacterInvitation, issueDomainBootstrapInvitation, issueDomainJoinInvitation } from './workflows'
import { resolveInvitation } from './service'

if (!/^file:.*p07x-t09-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t09-*.db; never the working DB.')

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payload = await getPayload({ config })

async function user(email: string, platform = false): Promise<number> {
  const row = await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, isPlatformAdmin: platform, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function domain(name: string, ownerUser: number | null, lifecycle: 'active' | 'setup-pending' = 'active') {
  return payload.create({ collection: 'domains', overrideAccess: true, data: { name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind: 'community', lifecycle, ...(ownerUser == null ? {} : { ownerUser }), defaultFilingPolicy: 'direct-file', publicEnabled: false } } as never)
}

const platformUserId = await user('p07x-t09-platform@example.test', true)
const applicantId = await user('p07x-t09-applicant@example.test')
const platformIdentity = await ensurePlatformAdminIdentity(payload, platformUserId)
const activeDomain = await domain('T09 Active Domain', applicantId)
const activeAdmin = await ensureDomainAdminIdentity(payload, activeDomain.id)
const setupDomain = await domain('T09 Setup Domain', null, 'setup-pending')

test('T09 platform bootstrap creates a pending request, then assigns one owner/admin atomically', async () => {
  const issued = await issueDomainBootstrapInvitation(payload, { actor: { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, domainId: setupDomain.id })
  assert.equal(issued.ok, true)
  if (!issued.ok) return
  const accepted = await acceptDomainBootstrapInvitation(payload, { userId: applicantId, token: issued.token })
  assert.equal(accepted.ok, true)
  if (!accepted.ok) return
  const decided = await decideDomainBootstrapRequest(payload, { actor: { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, requestId: accepted.request.id, decision: 'approved' })
  assert.equal(decided.ok, true)
  const domain = await payload.findByID({ collection: 'domains', id: setupDomain.id, depth: 0, overrideAccess: true })
  assert.equal(domain.lifecycle, 'active')
  assert.equal(Number(domain.ownerUser), applicantId)
  const admins = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: setupDomain.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(admins.docs.length, 1)
  assert.equal(Number(admins.docs[0].controlledBy), applicantId)
  assert.equal((await resolveInvitation(payload, issued.token)).status, 'exhausted')
})

test('T09 bootstrap rejection leaves the Domain ownerless and permits a replacement invite', async () => {
  const rejectedDomain = await domain('T09 Rejected Domain', null, 'setup-pending')
  const first = await issueDomainBootstrapInvitation(payload, { actor: { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, domainId: rejectedDomain.id })
  assert.equal(first.ok, true)
  if (!first.ok) return
  const accepted = await acceptDomainBootstrapInvitation(payload, { userId: applicantId, token: first.token })
  assert.equal(accepted.ok, true)
  if (!accepted.ok) return
  const rejected = await decideDomainBootstrapRequest(payload, { actor: { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, requestId: accepted.request.id, decision: 'rejected' })
  assert.equal(rejected.ok, true)
  const stillPending = await payload.findByID({ collection: 'domains', id: rejectedDomain.id, depth: 0, overrideAccess: true })
  assert.equal(stillPending.lifecycle, 'setup-pending')
  assert.equal(stillPending.ownerUser, null)
  const replacement = await issueDomainBootstrapInvitation(payload, { actor: { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, domainId: rejectedDomain.id })
  assert.equal(replacement.ok, true)
})

test('T09 Character invitation atomically claims only the invited ordinary Character', async () => {
  const target = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T09 Invited Character', kind: 'player', status: 'active' } })
  await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: activeDomain.id, character: target.id, status: 'active', addedBy: applicantId } })
  const issued = await issueCharacterInvitation(payload, { actor: { userId: applicantId, activeCharacterId: activeAdmin.characterId }, domainId: activeDomain.id, characterId: target.id })
  assert.equal(issued.ok, true)
  if (!issued.ok) return
  const accepted = await acceptCharacterInvitation(payload, { userId: platformUserId, token: issued.token })
  assert.equal(accepted.ok, true)
  const claimed = await payload.findByID({ collection: 'characters', id: target.id, depth: 0, overrideAccess: true })
  assert.equal(Number(claimed.controlledBy), platformUserId)
  const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: activeDomain.id } }, { character: { equals: target.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(membership.docs.length, 1)
  const second = await acceptCharacterInvitation(payload, { userId: applicantId, token: issued.token })
  assert.equal(second.ok, false)
})

test('T09 Domain join remains reusable, creates a pending request, and grants no role automatically', async () => {
  const joinUser = await user('p07x-t09-joiner@example.test')
  const issued = await issueDomainJoinInvitation(payload, { actor: { userId: applicantId, activeCharacterId: activeAdmin.characterId }, domainId: activeDomain.id })
  assert.equal(issued.ok, true)
  if (!issued.ok) return
  const first = await acceptDomainJoinInvitation(payload, { userId: joinUser, token: issued.token, requestedName: 'T09 New Resident' })
  assert.equal(first.ok, true)
  if (!first.ok) return
  const decided = await decideDomainJoinRequest(payload, { actor: { userId: applicantId, activeCharacterId: activeAdmin.characterId }, requestId: first.request.id, decision: 'approved' })
  assert.equal(decided.ok, true)
  if (!decided.ok || decided.characterId == null) return
  const member = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: activeDomain.id } }, { character: { equals: decided.characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(member.docs.length, 1)
  const roles = await payload.find({ collection: 'role-assignments', where: { character: { equals: decided.characterId } }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(roles.docs.length, 0)
  const secondUser = await user('p07x-t09-joiner-two@example.test')
  const second = await acceptDomainJoinInvitation(payload, { userId: secondUser, token: issued.token, requestedName: 'T09 Second Resident' })
  assert.equal(second.ok, true)
})

test('T09 invite authorization is identity- and Domain-specific', async () => {
  assert.equal(await canManageDomainInvitations(payload, { userId: applicantId, activeCharacterId: activeAdmin.characterId }, activeDomain.id), true)
  assert.equal(await canManageDomainInvitations(payload, { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, activeDomain.id), false)
  const forged = await issueDomainJoinInvitation(payload, { actor: { userId: applicantId, activeCharacterId: activeAdmin.characterId }, domainId: setupDomain.id })
  assert.equal(forged.ok, false)
})

test('T09 platform can create an ownerless setup-pending Domain, but ordinary actors cannot', async () => {
  const denied = await createSetupPendingDomain(payload, { actor: { userId: applicantId, activeCharacterId: activeAdmin.characterId }, name: 'Denied', slug: 'denied-t09' })
  assert.equal(denied.ok, false)
  const created = await createSetupPendingDomain(payload, { actor: { userId: platformUserId, activeCharacterId: platformIdentity.characterId }, name: 'Created T09 Domain', slug: `created-t09-${Date.now()}` })
  assert.equal(created.ok, true)
  if (created.ok) {
    assert.equal(created.domain.lifecycle, 'setup-pending')
    assert.equal(created.domain.ownerUser, null)
  }
})

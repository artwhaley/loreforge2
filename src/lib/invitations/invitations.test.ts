import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import test from 'node:test'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'

import { assertInvitationShape } from './validate'
import { consumeInvitation, hashInvitationToken, invitationPath, issueInvitation, listInvitations, revokeInvitation, resolveInvitation, toSafeInvitation } from './service'
import { isInvitationToken } from './types'

if (!/^file:.*p07x-t08-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t08-*.db; never the working DB.')

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payload = await getPayload({ config })

async function user(email: string, isPlatformAdmin = false): Promise<number> {
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  const row = found.docs[0] ?? await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, isPlatformAdmin, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function domain(name: string, ownerUser: number | null, lifecycle: 'active' | 'setup-pending' = 'active'): Promise<number> {
  const row = await payload.create({ collection: 'domains', overrideAccess: true, data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), kind: 'community', lifecycle, ...(ownerUser == null ? {} : { ownerUser }), defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
  return Number(row.id)
}

const ownerUserId = await user('p07x-t08-owner@example.test')
const platformUserId = await user('p07x-t08-platform@example.test', true)
const recipientUserId = await user('p07x-t08-recipient@example.test')
const activeDomainId = await domain('P07X T08 Active Domain', ownerUserId)
const pendingDomainId = await domain('P07X T08 Pending Domain', null, 'setup-pending')
const domainAdmin = await ensureDomainAdminIdentity(payload, activeDomainId)
const platformAdmin = await ensurePlatformAdminIdentity(payload, platformUserId)
const claimCharacter = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T08 Unclaimed Character', kind: 'player', status: 'active' } })
await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: activeDomainId, character: claimCharacter.id, status: 'active', addedBy: ownerUserId } })

test('T08 shape is a strict discriminated purpose contract', () => {
  assert.equal(assertInvitationShape({ purpose: 'domain_bootstrap', domain: pendingDomainId, issuedByUser: platformUserId, issuedByCharacter: platformAdmin.characterId, maxUses: 1 }), 'domain_bootstrap')
  assert.equal(assertInvitationShape({ purpose: 'character_claim', domain: activeDomainId, character: claimCharacter.id, issuedByUser: ownerUserId, issuedByCharacter: domainAdmin.characterId, maxUses: 1 }), 'character_claim')
  assert.equal(assertInvitationShape({ purpose: 'domain_join', domain: activeDomainId, issuedByUser: ownerUserId, issuedByCharacter: domainAdmin.characterId, maxUses: null }), 'domain_join')
  assert.throws(() => assertInvitationShape({ purpose: 'domain_bootstrap', domain: pendingDomainId, issuedByUser: platformUserId, issuedByCharacter: platformAdmin.characterId, maxUses: 2 }), /maxUses=1/)
  assert.throws(() => assertInvitationShape({ purpose: 'character_claim', domain: activeDomainId, issuedByUser: ownerUserId, issuedByCharacter: domainAdmin.characterId, maxUses: 1 }), /must target one Character/)
  assert.throws(() => assertInvitationShape({ purpose: 'domain_join', domain: activeDomainId, character: claimCharacter.id, issuedByUser: ownerUserId, issuedByCharacter: domainAdmin.characterId, maxUses: null }), /cannot target a Character/)
})

test('T08 issued token is one-way, 256-bit material and safe serialization omits the digest', async () => {
  const issued = await issueInvitation(payload, { purpose: 'domain_join', domainId: activeDomainId, issuedByUserId: ownerUserId, issuedByCharacterId: domainAdmin.characterId as number })
  assert.equal(isInvitationToken(issued.token), true)
  assert.equal(Buffer.from(issued.token, 'base64url').length, 32)
  assert.equal(hashInvitationToken(issued.token).length, 64)
  const row = await payload.findByID({ collection: 'invitations', id: issued.invitation.id, depth: 0, overrideAccess: true })
  assert.notEqual(String(row.tokenHash), issued.token)
  assert.notEqual(String(row.tokenHash), JSON.stringify(issued))
  assert.equal('tokenHash' in issued.invitation, false)
  assert.equal(JSON.stringify(issued.invitation).includes(issued.token), false)
  assert.equal(invitationPath(issued.token), `/invite/${encodeURIComponent(issued.token)}`)
})

test('T08 resolve and consume fail closed for revoked, expired, and exhausted links', async () => {
  const expired = await issueInvitation(payload, { purpose: 'domain_join', domainId: activeDomainId, issuedByUserId: ownerUserId, issuedByCharacterId: domainAdmin.characterId as number, expiresAt: new Date(Date.now() - 60_000) })
  assert.equal((await resolveInvitation(payload, expired.token)).status, 'expired')
  assert.equal((await consumeInvitation(payload, expired.token)).consumed, false)

  const revoked = await issueInvitation(payload, { purpose: 'domain_join', domainId: activeDomainId, issuedByUserId: ownerUserId, issuedByCharacterId: domainAdmin.characterId as number })
  await revokeInvitation(payload, revoked.invitation.id)
  assert.equal((await resolveInvitation(payload, revoked.token)).status, 'revoked')
  assert.equal((await consumeInvitation(payload, revoked.token)).consumed, false)

  const oneUse = await issueInvitation(payload, { purpose: 'character_claim', domainId: activeDomainId, characterId: claimCharacter.id, issuedByUserId: ownerUserId, issuedByCharacterId: domainAdmin.characterId as number })
  assert.equal((await consumeInvitation(payload, oneUse.token, { expectedPurpose: 'character_claim' })).consumed, true)
  assert.equal((await resolveInvitation(payload, oneUse.token)).status, 'exhausted')
  assert.equal((await consumeInvitation(payload, oneUse.token)).consumed, false)
})

test('T08 one-use consumption has one winner across independent Payload connections', async () => {
  const target = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T08 Race Character', kind: 'player', status: 'active' } })
  await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: activeDomainId, character: target.id, status: 'active', addedBy: ownerUserId } })
  const issued = await issueInvitation(payload, { purpose: 'character_claim', domainId: activeDomainId, characterId: target.id, issuedByUserId: ownerUserId, issuedByCharacterId: domainAdmin.characterId as number })
  const second = await getPayload({ config })
  const outcomes = await Promise.all([consumeInvitation(payload, issued.token, { expectedPurpose: 'character_claim' }), consumeInvitation(second as Payload, issued.token, { expectedPurpose: 'character_claim' })])
  assert.equal(outcomes.filter((result) => result.consumed).length, 1)
  assert.equal(outcomes.filter((result) => result.status === 'exhausted' || result.status === 'invalid').length, 1)
  const stored = await payload.findByID({ collection: 'invitations', id: issued.invitation.id, depth: 0, overrideAccess: true })
  assert.equal(Number(stored.useCount), 1)
})

test('T08 list projection reports safe status fields without raw token material', async () => {
  const rows = await listInvitations(payload, { domainId: activeDomainId })
  assert.ok(rows.length > 0)
  for (const row of rows) {
    assert.equal('tokenHash' in row, false)
    assert.equal('token' in row, false)
    assert.equal(typeof row.status, 'string')
    assert.equal(typeof row.exhausted, 'boolean')
  }
  assert.equal('tokenHash' in toSafeInvitation({ id: 999, purpose: 'domain_join', domain: activeDomainId, issuedByUser: ownerUserId, issuedByCharacter: domainAdmin.characterId, useCount: 0 }), false)
})


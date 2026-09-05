import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import test from 'node:test'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'
import { issueDomainBootstrapInvitation, issueDomainJoinInvitation, acceptDomainBootstrapInvitation, acceptDomainJoinInvitation } from '@/lib/invitations/workflows'
import { transitionDocument } from '@/lib/documents/workflow'

import { projectDomainWork, projectPlatformWork } from './projection'

if (!/^file:.*p07x-t10-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t10-*.db; never the working DB.')

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payload = await getPayload({ config })
const user = async (email: string, platform = false) => Number((await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, isPlatformAdmin: platform, slVerificationState: 'unlinked' } })).id)
const platformUser = await user('p07x-t10-platform@example.test', true)
const ownerUser = await user('p07x-t10-owner@example.test')
const joinUser = await user('p07x-t10-joiner@example.test')
const domain = await payload.create({ collection: 'domains', overrideAccess: true, data: { name: 'T10 Work Domain', slug: 't10-work-domain', kind: 'community', lifecycle: 'active', ownerUser, defaultFilingPolicy: 'direct-file', publicEnabled: false } } as never) as unknown as { id: number; slug: string }
const domainAdmin = await ensureDomainAdminIdentity(payload, domain.id)
const platformAdmin = await ensurePlatformAdminIdentity(payload, platformUser)
const ordinary = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T10 Sergeant', kind: 'player', status: 'active', controlledBy: ownerUser } })
await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: domain.id, character: ordinary.id, status: 'active', addedBy: ownerUser } })
const target = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T10 Unclaimed', kind: 'player', status: 'active' } })
await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: domain.id, character: target.id, status: 'active', addedBy: ownerUser } })
const claim = await payload.create({ collection: 'character-claim-requests', overrideAccess: true, data: { domain: domain.id, character: target.id, claimant: joinUser, status: 'pending', requestedAt: new Date().toISOString() } })
const root = await payload.create({ collection: 'folders', draft: false, overrideAccess: true, data: { domain: domain.id, name: 'T10 Pending Incident Reports', parent: null, systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } } as never)
const type = await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domain.id, name: 'T10 Incident Report', active: true, defaultFilingPolicy: 'direct-file', allowBlank: true } } as never)
const doc = await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true }, data: { domain: domain.id, documentType: type.id, folder: root.id, title: 'T10 Pending Incident', body: '# Pending\n', lifecycle: 'pending_review', publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: ownerUser } } as never)
await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { domain: domain.id, principalType: 'Character', principal: { relationTo: 'characters', value: ordinary.id }, resourceType: 'DocumentType', resource: { relationTo: 'document-types', value: type.id }, capability: 'approve_document', effect: 'grant', active: true, actorUser: ownerUser } } as never)

test('T10 Platform Work contains bootstrap/merge sources but no Domain join or document work', async () => {
  const setup = await payload.create({ collection: 'domains', overrideAccess: true, data: { name: 'T10 Setup', slug: 't10-setup', kind: 'community', lifecycle: 'setup-pending', ownerUser: null, defaultFilingPolicy: 'direct-file', publicEnabled: false } } as never)
  const issued = await issueDomainBootstrapInvitation(payload, { actor: { userId: platformUser, activeCharacterId: platformAdmin.characterId }, domainId: setup.id })
  assert.equal(issued.ok, true)
  if (!issued.ok) return
  const accepted = await acceptDomainBootstrapInvitation(payload, { userId: joinUser, token: issued.token })
  assert.equal(accepted.ok, true)
  const work = await projectPlatformWork(payload, { userId: platformUser, activeCharacterId: platformAdmin.characterId })
  assert.equal(work.authorized, true)
  assert.ok(work.entries.some((entry) => entry.kind === 'bootstrap'))
  assert.equal(work.entries.some((entry) => entry.kind === 'join' || entry.kind === 'claim' || entry.kind === 'document'), false)
})

test('T10 Domain Administrator Work projects joins, claims, and pending documents', async () => {
  const invite = await issueDomainJoinInvitation(payload, { actor: { userId: ownerUser, activeCharacterId: domainAdmin.characterId }, domainId: domain.id })
  assert.equal(invite.ok, true)
  if (!invite.ok) return
  const join = await acceptDomainJoinInvitation(payload, { userId: joinUser, token: invite.token, requestedName: 'T10 New Resident' })
  assert.equal(join.ok, true)
  const work = await projectDomainWork(payload, { userId: ownerUser, activeCharacterId: domainAdmin.characterId }, domain.id, { domainSlug: domain.slug })
  assert.equal(work.authorized, true)
  assert.equal(work.domainAdmin, true)
  assert.ok(work.entries.some((entry) => entry.kind === 'join'))
  assert.ok(work.entries.some((entry) => entry.kind === 'claim' && entry.id === Number(claim.id)))
  assert.ok(work.entries.some((entry) => entry.kind === 'document' && entry.id === Number(doc.id)))
})

test('T10 ordinary Character Work receives only approvable Documents, never admin request queues', async () => {
  const work = await projectDomainWork(payload, { userId: ownerUser, activeCharacterId: ordinary.id }, domain.id, { domainSlug: domain.slug })
  assert.equal(work.authorized, true)
  assert.equal(work.domainAdmin, false)
  assert.ok(work.entries.some((entry) => entry.kind === 'document' && entry.id === Number(doc.id)))
  assert.equal(work.entries.some((entry) => entry.kind === 'join' || entry.kind === 'claim'), false)
})

test('T10 a same-User ordinary identity does not inherit hidden platform/Domain-admin queues', async () => {
  const ordinarySameUser = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T10 Lucan', kind: 'player', status: 'active', controlledBy: ownerUser } })
  await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: domain.id, character: ordinarySameUser.id, status: 'active', addedBy: ownerUser } })
  const work = await projectDomainWork(payload, { userId: ownerUser, activeCharacterId: ordinarySameUser.id }, domain.id, { domainSlug: domain.slug })
  assert.equal(work.domainAdmin, false)
  assert.equal(work.entries.some((entry) => entry.kind === 'join' || entry.kind === 'claim'), false)
})

test('T10 approving a pending Document removes it from Work through lifecycle state', async () => {
  const before = await projectDomainWork(payload, { userId: ownerUser, activeCharacterId: domainAdmin.characterId }, domain.id, { domainSlug: domain.slug })
  assert.ok(before.entries.some((entry) => entry.kind === 'document' && entry.id === Number(doc.id)))
  await transitionDocument({ payload, userId: ownerUser, domainId: domain.id, documentId: doc.id, actorCharacterId: domainAdmin.characterId, operation: 'approve' })
  const after = await projectDomainWork(payload, { userId: ownerUser, activeCharacterId: domainAdmin.characterId }, domain.id, { domainSlug: domain.slug })
  assert.equal(after.entries.some((entry) => entry.kind === 'document' && entry.id === Number(doc.id)), false)
})

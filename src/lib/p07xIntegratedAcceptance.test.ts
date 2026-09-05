import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import test from 'node:test'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { seedP07XIntegrated } from '@/seed/p07xIntegrated'
import { ensureDomainAdminIdentity } from '@/lib/characters/provisioning'
import { isAllowed } from '@/lib/authz/evaluate'
import { createSetupPendingDomain, issueDomainBootstrapInvitation, acceptDomainBootstrapInvitation, decideDomainBootstrapRequest, issueCharacterInvitation, acceptCharacterInvitation, issueDomainJoinInvitation, acceptDomainJoinInvitation, decideDomainJoinRequest } from '@/lib/invitations/workflows'
import { renderNeutralTemplate } from '@/lib/forms/generateDocument'
import { projectDomainWork } from '@/lib/work/projection'
import { transitionDocument } from '@/lib/documents/workflow'

if (!/^file:.*p07x-t11-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t11-*.db; never the working DB.')

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payload = await getPayload({ config })
const fixture = await seedP07XIntegrated(payload)
const actor = (userId: number, activeCharacterId: number | null) => ({ userId, activeCharacterId })
const relationNumber = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

test('T11 integrated fixture separates identities, Types, roles, and workflow routes', async () => {
  const identityRows = await payload.find({ collection: 'characters', where: { controlledBy: { equals: fixture.users.admin } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  assert.equal(identityRows.docs.filter((row) => row.kind === 'platform_admin' && row.status === 'active').length, 1)
  assert.equal(identityRows.docs.filter((row) => row.kind === 'domain_admin' && row.status === 'active').length, 1)

  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.admin, fixture.characters.platformAdmin), domainId: fixture.domain, capability: 'create_document', resource: { type: 'DocumentType', id: fixture.types.incident } }), false)
  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.admin, fixture.characters.domainAdmin), domainId: fixture.domain, capability: 'create_document', resource: { type: 'DocumentType', id: fixture.types.incident } }), true)
  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.tarl, fixture.characters.tarl), domainId: fixture.domain, capability: 'create_document', resource: { type: 'DocumentType', id: fixture.types.incident } }), true)
  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.tarl, fixture.characters.tarl), domainId: fixture.domain, capability: 'read', resource: { type: 'DocumentType', id: fixture.types.property } }), false)
  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.cassius, fixture.characters.cassius), domainId: fixture.domain, capability: 'read', resource: { type: 'DocumentType', id: fixture.types.property } }), true)
  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.admin, fixture.characters.lucan), domainId: fixture.domain, capability: 'read', resource: { type: 'DocumentType', id: fixture.types.trade } }), true)
  assert.equal(await isAllowed({ payload, actor: actor(fixture.users.admin, fixture.characters.npc), domainId: fixture.domain, capability: 'read', resource: { type: 'DocumentType', id: fixture.types.incident } }), false)

  const type = await payload.findByID({ collection: 'document-types', id: fixture.types.incident, depth: 0, overrideAccess: true })
  assert.equal(type.allowBlank, true)
  assert.equal(type.allowTemplate, true)
  assert.equal(type.allowForm, true)
  assert.equal(relationNumber(type.pendingReviewFolder), fixture.folders.pendingIncident)
  assert.equal(relationNumber(type.filedFolder), fixture.folders.investigatingIncident)
  assert.equal(relationNumber(type.lockedFolder), fixture.folders.closedIncident)

  const form = await payload.findByID({ collection: 'templates', id: fixture.templates.form, depth: 0, overrideAccess: true })
  const rendered = renderNeutralTemplate(form as never, { incident_date: '2026-09-01', location: '118 Market Street', narrative: 'A broken window was documented.' })
  assert.match(rendered.body, /^# Ar Civic Archive/)
  assert.match(rendered.body, /A broken window was documented/)
  assert.match(rendered.body, /Filed through the Ar civic archive\./)

  const pending = await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true }, data: { domain: fixture.domain, documentType: fixture.types.incident, folder: fixture.folders.pendingIncident, title: 'T11 Pending Incident', body: '# T11\n', lifecycle: 'pending_review', publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: fixture.users.tarl } } as never)
  const work = await projectDomainWork(payload, actor(fixture.users.marlen, fixture.characters.marlen), fixture.domain, { domainSlug: 'ar' })
  assert.ok(work.entries.some((entry) => entry.kind === 'document' && entry.id === Number(pending.id)))
  await transitionDocument({ payload, userId: fixture.users.marlen, domainId: fixture.domain, documentId: pending.id, actorCharacterId: fixture.characters.marlen, operation: 'approve' })
  const filed = await payload.findByID({ collection: 'documents', id: pending.id, depth: 0, overrideAccess: true })
  assert.equal(filed.lifecycle, 'filed')
  assert.equal(relationNumber(filed.folder), fixture.folders.investigatingIncident)
  await transitionDocument({ payload, userId: fixture.users.marlen, domainId: fixture.domain, documentId: pending.id, actorCharacterId: fixture.characters.marlen, operation: 'lock' })
  const locked = await payload.findByID({ collection: 'documents', id: pending.id, depth: 0, overrideAccess: true })
  assert.equal(locked.lifecycle, 'locked')
  assert.equal(relationNumber(locked.folder), fixture.folders.closedIncident)
})

test('T11 integrated bootstrap and Character invite path provisions exactly one Domain admin', async () => {
  const setup = await createSetupPendingDomain(payload, { actor: { userId: fixture.users.admin, activeCharacterId: fixture.characters.platformAdmin }, name: 'T11 Empty Domain', slug: 't11-empty-domain' })
  assert.equal(setup.ok, true)
  if (!setup.ok) return
  const issued = await issueDomainBootstrapInvitation(payload, { actor: { userId: fixture.users.admin, activeCharacterId: fixture.characters.platformAdmin }, domainId: setup.domain.id })
  assert.equal(issued.ok, true)
  if (!issued.ok) return
  const recipient = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 't11-recipient@example.test', name: 'T11 Recipient', password: 'test-password-123', slVerificationState: 'unlinked' } })
  const accepted = await acceptDomainBootstrapInvitation(payload, { userId: recipient.id, token: issued.token })
  assert.equal(accepted.ok, true)
  if (!accepted.ok) return
  const decided = await decideDomainBootstrapRequest(payload, { actor: { userId: fixture.users.admin, activeCharacterId: fixture.characters.platformAdmin }, requestId: accepted.request.id, decision: 'approved' })
  assert.equal(decided.ok, true)
  const admins = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: setup.domain.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  assert.equal(admins.docs.length, 1)
  assert.equal(relationNumber(admins.docs[0]?.controlledBy), Number(recipient.id))
  assert.equal(await ensureDomainAdminIdentity(payload, setup.domain.id).then((result) => result.reason), 'existing')

  const claim = await issueCharacterInvitation(payload, { actor: { userId: fixture.users.admin, activeCharacterId: fixture.characters.domainAdmin }, domainId: fixture.domain, characterId: fixture.characters.unclaimed })
  assert.equal(claim.ok, true)
  if (!claim.ok) return
  const claimed = await acceptCharacterInvitation(payload, { userId: recipient.id, token: claim.token })
  assert.equal(claimed.ok, true)
  const unclaimed = await payload.findByID({ collection: 'characters', id: fixture.characters.unclaimed, depth: 0, overrideAccess: true })
  assert.equal(relationNumber(unclaimed.controlledBy), Number(recipient.id))

  const joinInvite = await issueDomainJoinInvitation(payload, { actor: { userId: fixture.users.admin, activeCharacterId: fixture.characters.domainAdmin }, domainId: fixture.domain })
  assert.equal(joinInvite.ok, true)
  if (!joinInvite.ok) return
  const joiner = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 't11-joiner@example.test', name: 'T11 Joiner', password: 'test-password-123', slVerificationState: 'unlinked' } })
  const joined = await acceptDomainJoinInvitation(payload, { userId: joiner.id, token: joinInvite.token, requestedName: 'T11 New Resident' })
  assert.equal(joined.ok, true)
  if (!joined.ok) return
  const joinDecision = await decideDomainJoinRequest(payload, { actor: { userId: fixture.users.admin, activeCharacterId: fixture.characters.domainAdmin }, requestId: joined.request.id, decision: 'approved' })
  assert.equal(joinDecision.ok, true)
  if (!joinDecision.ok || joinDecision.characterId == null) return
  const joinedMembership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: fixture.domain } }, { character: { equals: joinDecision.characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(joinedMembership.docs.length, 1)
  const joinedRoles = await payload.find({ collection: 'role-assignments', where: { character: { equals: joinDecision.characterId } }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(joinedRoles.docs.length, 0)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { evaluatePermission, isAllowed } from './evaluate'
import { authorizePlatformOperation } from './platform'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'
import { findDashboardIdentities } from '@/lib/characters/identitySelect'

if (!/^file:.*p07x-t02-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t02-*.db; never the working DB.')

const payload = await getPayload({ config })

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

async function user(email: string, platform = false): Promise<number> {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, isPlatformAdmin: platform, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function communityDomain(slug: string, ownerUserId: number): Promise<number> {
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'domains', overrideAccess: true, data: { slug, name: slug, ownerUser: ownerUserId, kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
  return Number(row.id)
}

const adminUserId = await user('p07x-t02-admin@example.test', true)
const otherOwnerId = await user('p07x-t02-other@example.test')
const arId = await communityDomain('p07x-t02-ar', adminUserId)
const bayId = await communityDomain('p07x-t02-bay', otherOwnerId)

// Root folders + a document in each domain.
async function rootFolder(domainId: number): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const folder = await payload.create({ collection: 'folders', draft: false, overrideAccess: true, data: { domain: domainId, name: 'Domain Root', systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(folder.id)
}

// Sequential only: concurrent payload.create calls share one SQLite connection
// and deadlock with SQLITE_BUSY.
const arRootId = await rootFolder(arId)
const bayRootId = await rootFolder(bayId)
async function plainType(domainId: number): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: 'Plain Text' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const type = existing.docs[0] ?? await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domainId, name: 'Plain Text', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } })
  return Number(type.id)
}
const arTypeId = await plainType(arId)
async function docIn(domainId: number, typeId: number, folderId: number, title: string, userId: number): Promise<number> {
  const existing = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { title: { equals: title } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: userId }, data: { domain: domainId, documentType: typeId, folder: folderId, title, body: `# ${title}\n\nbody`, lifecycle: 'filed', publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: userId } })
  return Number(row.id)
}
const arDocId = await docIn(arId, arTypeId, arRootId, 'T02 Ar Record', adminUserId)

// Acting identities for the one admin User: Administrator, Administrator of Ar,
// and an ordinary controlled member Character (Lucan).
const platformIdentity = await ensurePlatformAdminIdentity(payload, adminUserId)
assert.ok(platformIdentity.characterId != null)
const arAdminIdentity = await ensureDomainAdminIdentity(payload, arId)
assert.ok(arAdminIdentity.characterId != null)
const lucanRow = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T02 Lucan', kind: 'player', controlledBy: adminUserId, status: 'active' } })
await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: arId, character: Number(lucanRow.id), status: 'active', addedBy: adminUserId } })
// A player Character of the other User (forged-target test).
const outsiderRow = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'T02 Outsider', kind: 'player', controlledBy: otherOwnerId, status: 'active' } })

test('GATE-A-1 same User can select Platform Admin, matching Domain Admin, and ordinary Character', async () => {
  const identities = await findDashboardIdentities(payload, adminUserId)
  const kinds = [...new Set(identities.map((identity) => String(identity.kind)))].sort()
  assert.deepEqual(kinds, ['domain_admin', 'platform_admin', 'player'], 'the selector offers every acting identity of this User')
})

const actor = (characterId: number | null) => ({ userId: adminUserId, activeCharacterId: characterId })
const resource = (domainId: number, id: number) => ({ type: 'Folder' as const, id })
const docResource = (id: number) => ({ type: 'Document' as const, id })

test('T02 Platform Administrator cannot create/edit/file an ordinary Domain Document', async () => {
  assert.equal(await isAllowed({ payload, actor: actor(platformIdentity.characterId as number), domainId: arId, capability: 'create_document', resource: resource(arId, arRootId) }), false, 'platform identity has no Domain create authority')
  assert.equal(await isAllowed({ payload, actor: actor(platformIdentity.characterId as number), domainId: arId, capability: 'edit_document', resource: docResource(arDocId) }), false)
  assert.equal(await isAllowed({ payload, actor: actor(platformIdentity.characterId as number), domainId: arId, capability: 'file_document', resource: docResource(arDocId) }), false)
})

test('T02 Administrator of Ar can operate Ar without RoleAssignment (identity authority)', async () => {
  const create = await evaluatePermission({ payload, actor: actor(arAdminIdentity.characterId as number), domainId: arId, capability: 'create_document', resource: resource(arId, arRootId) })
  assert.equal(create.allowed, true)
  assert.match(create.reason, /Acting Domain Admin authority/)
  assert.equal(await isAllowed({ payload, actor: actor(arAdminIdentity.characterId as number), domainId: arId, capability: 'edit_document', resource: docResource(arDocId) }), true)
  assert.equal(await isAllowed({ payload, actor: actor(arAdminIdentity.characterId as number), domainId: arId, capability: 'file_document', resource: docResource(arDocId) }), true)
})

test('T02 Administrator of Ar cannot operate a second Domain', async () => {
  assert.equal(await isAllowed({ payload, actor: actor(arAdminIdentity.characterId as number), domainId: bayId, capability: 'read', resource: resource(bayId, bayRootId) }), false)
  const cross = await evaluatePermission({ payload, actor: actor(arAdminIdentity.characterId as number), domainId: bayId, capability: 'edit_document', resource: { type: 'Document', id: arDocId } })
  assert.equal(cross.allowed, false, 'Administrator of Ar reaches no authority in Bayview and never crosses Domains')
})

test('T02 ordinary Character does not inherit User platform/owner authority', async () => {
  const lucanId = Number(lucanRow.id)
  assert.equal(await isAllowed({ payload, actor: actor(lucanId), domainId: arId, capability: 'edit_document', resource: docResource(arDocId) }), false, 'Lucan gets no Domain-owner authority')
  assert.equal(await isAllowed({ payload, actor: actor(lucanId), domainId: arId, capability: 'create_document', resource: resource(arId, arRootId) }), false, 'no rule yet, default deny')
})

test('T02 domain_admin cannot pass the platform authorization seam', async () => {
  const decision = await authorizePlatformOperation(payload, actor(arAdminIdentity.characterId as number))
  assert.equal(decision.allowed, false)
})

test('T02 platform_admin cannot pass the Domain-admin shortcut and passes the platform seam', async () => {
  const platformId = platformIdentity.characterId as number
  const seam = await authorizePlatformOperation(payload, actor(platformId))
  assert.equal(seam.allowed, true)
  assert.equal(await isAllowed({ payload, actor: actor(platformId), domainId: arId, capability: 'manage_members', resource: { type: 'Domain', id: arId } }), false)
})

test('T02 forged and stale acting Character IDs fail closed', async () => {
  // Another user's Character cannot be selected.
  assert.equal(await isAllowed({ payload, actor: actor(Number(outsiderRow.id)), domainId: arId, capability: 'read', resource: resource(arId, arRootId) }), false)
  // A stale (inactive) identity resolves to no tuple and no authority.
  const arAdminId = arAdminIdentity.characterId as number
  await payload.update({ collection: 'characters', id: arAdminId, overrideAccess: true, data: { status: 'inactive' } })
  assert.equal(await isAllowed({ payload, actor: actor(arAdminId), domainId: arId, capability: 'edit_document', resource: docResource(arDocId) }), false)
  // Restore the identity for any later assertions.
  await ensureDomainAdminIdentity(payload, arId)
  assert.equal(await isAllowed({ payload, actor: actor(arAdminId), domainId: arId, capability: 'edit_document', resource: docResource(arDocId) }), true)
})

test('T02 legacy domain-admins rows do not authorize a different acting Character', async () => {
  // A legacy row grants nothing through the evaluator when the acting identity
  // is an ordinary Character (or absent).
  const existing = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: arId } }, { user: { equals: adminUserId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (!existing.docs[0]) await payload.create({ collection: 'domain-admins', overrideAccess: true, data: { domain: arId, user: adminUserId, status: 'active', addedBy: adminUserId } })
  assert.equal(await isAllowed({ payload, actor: actor(null), domainId: arId, capability: 'manage_members', resource: { type: 'Domain', id: arId } }), false)
  assert.equal(await isAllowed({ payload, actor: actor(Number(lucanRow.id)), domainId: arId, capability: 'manage_members', resource: { type: 'Domain', id: arId } }), false)
})

void idOf
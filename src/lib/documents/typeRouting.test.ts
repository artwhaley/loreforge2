import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { resolveLifecycleRouteFolder } from './typeRouting'
import { transitionDocument } from './workflow'
import { ensureDomainAdminIdentity } from '@/lib/characters/provisioning'

if (!/^file:.*p07x-t05-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t05-*.db; never the working DB.')

const payload = await getPayload({ config })

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

async function user(email: string): Promise<number> {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function communityDomain(slug: string, ownerUserId: number): Promise<number> {
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'domains', overrideAccess: true, data: { slug, name: slug, ownerUser: ownerUserId, kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
  return Number(row.id)
}

async function folder(domainId: number, name: string, parentId: number | null = null): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name, parent: parentId, systemManaged: parentId === null, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(row.id)
}

const ownerId = await user('p07x-t05-owner@example.test')
const alphaId = await communityDomain('p07x-t05-alpha', ownerId)
const admin = await ensureDomainAdminIdentity(payload, alphaId)
if (!admin.characterId) throw new Error('domain_admin identity must provision')
const adminId = admin.characterId
// Sequential only: concurrent payload.create calls share one SQLite connection
// and deadlock with SQLITE_BUSY.
const rootId = await folder(alphaId, 'Domain Root')
const pendingId = await folder(alphaId, 'Pending Incident Reports', rootId)
const investigatingId = await folder(alphaId, 'Investigating Incident Reports', rootId)
const closedId = await folder(alphaId, 'Closed Incident Reports', rootId)

async function routedType(): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: alphaId } }, { name: { equals: 'Incident Report' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: alphaId, name: 'Incident Report', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit', defaultFolder: rootId, draftFolder: rootId, pendingReviewFolder: pendingId, filedFolder: investigatingId, lockedFolder: closedId } })
  return Number(row.id)
}
const typeId = await routedType()

async function draftDoc(title: string, startFolderId = rootId): Promise<number> {
  const existing = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: alphaId } }, { title: { equals: title } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: ownerId }, data: { domain: alphaId, documentType: typeId, folder: startFolderId, title, body: `# ${title}\n\nbody`, lifecycle: 'draft', publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: ownerId } })
  return Number(row.id)
}

const stateOf = async (documentId: number) => {
  const row = await payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true })
  return { lifecycle: String((row as { lifecycle?: unknown }).lifecycle), folderId: idOf((row as { folder?: unknown }).folder) }
}

const actor = (characterId: number | null) => ({ userId: ownerId, activeCharacterId: characterId })

test('T05 transitions route the record through the Type lifecycle Folders atomically', async () => {
  const docId = await draftDoc('T05 Route Me')
  const submitted = await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'submit' })
  assert.equal(submitted.lifecycle, 'pending_review')
  assert.equal(idOf((submitted as { folder?: unknown }).folder), pendingId)
  assert.deepEqual(await stateOf(docId), { lifecycle: 'pending_review', folderId: pendingId })
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'approve' })
  assert.deepEqual(await stateOf(docId), { lifecycle: 'filed', folderId: investigatingId })
  // Provenance records prior/routed Folder and the reason.
  const events = await payload.find({ collection: 'document-provenance-events', where: { and: [{ document: { equals: docId } }, { eventType: { equals: 'approved' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const event = events.docs[0] as { context?: { priorFolderId?: number; routedFolderId?: number; reason?: string } }
  assert.equal(event.context?.priorFolderId, pendingId)
  assert.equal(event.context?.routedFolderId, investigatingId)
  assert.equal(event.context?.reason, 'lifecycle-route')
})

test('T05 failed authorization changes neither lifecycle nor Folder', async () => {
  const docId = await draftDoc('T05 No Auth')
  await assert.rejects(
    () => transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: null, operation: 'submit' }),
    /Resource not found|required|Denied/,
  )
  assert.deepEqual(await stateOf(docId), { lifecycle: 'draft', folderId: rootId })
})

test('T05 reject returns the record to the Draft route', async () => {
  const docId = await draftDoc('T05 Reject Me')
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'submit' })
  assert.equal((await stateOf(docId)).folderId, pendingId)
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'reject', note: 'Needs a seal' })
  assert.deepEqual(await stateOf(docId), { lifecycle: 'draft', folderId: rootId })
})

test('T05 unlock returns the record to the Filed route', async () => {
  const docId = await draftDoc('T05 Unlock Me')
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'file' })
  assert.equal((await stateOf(docId)).folderId, investigatingId)
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'lock' })
  assert.deepEqual(await stateOf(docId), { lifecycle: 'locked', folderId: closedId })
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'unlock' })
  assert.deepEqual(await stateOf(docId), { lifecycle: 'filed', folderId: investigatingId })
})

test('T05 multiple lifecycle states may share one route Folder', async () => {
  const shared = await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: alphaId, name: 'Shared Route Type', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit', defaultFolder: rootId, draftFolder: rootId, pendingReviewFolder: rootId, filedFolder: rootId, lockedFolder: rootId } })
  const docId = await draftDoc('T05 Shared Route')
  await payload.update({ collection: 'documents', id: docId, overrideAccess: true, data: { documentType: Number(shared.id) } })
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'submit' })
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'approve' })
  await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'lock' })
  // Filed and Locked both route to the same Folder — no relocation.
  assert.deepEqual(await stateOf(docId), { lifecycle: 'locked', folderId: rootId })
})

test('T05 a routing Folder from another Domain is rejected', async () => {
  const betaId = await communityDomain('p07x-t05-beta', ownerId)
  const betaRoot = await folder(betaId, 'Beta Root')
  await assert.rejects(
    () => payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: alphaId, name: 'Cross Domain Type', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit', defaultFolder: betaRoot } }),
    /routing Folder must belong to the same Domain/,
  )
})

test('T05 ordinary callers can never supply a workflow destination', async () => {
  const docId = await draftDoc('T05 No Destination')
  const foreignFolder = idOf((await payload.find({ collection: 'folders', where: { domain: { equals: (await communityDomain('p07x-t05-gamma', ownerId)) } }, depth: 0, limit: 1, overrideAccess: true })).docs[0]?.id)
  // Planting a caller-chosen destination is ignored: the routed Folder wins.
  const result = await transitionDocument({ payload, userId: ownerId, domainId: alphaId, documentId: docId, actorCharacterId: adminId, operation: 'submit', ...(foreignFolder ? { folder: foreignFolder, destination: foreignFolder } : {}) } as never)
  assert.equal(idOf((result as { folder?: unknown }).folder), pendingId)
  assert.notEqual(idOf((result as { folder?: unknown }).folder), foreignFolder)
})

test('T05 routing helper: state Folder wins, defaultFolder is the fallback, current keeps legacy records', () => {
  const type = { defaultFolder: 10, draftFolder: 11, pendingReviewFolder: 12, filedFolder: 13, lockedFolder: 14 }
  assert.equal(resolveLifecycleRouteFolder(type, 'pending_review', 1), 12)
  assert.equal(resolveLifecycleRouteFolder(type, 'locked', 1), 14)
  const noState = { defaultFolder: 10 }
  assert.equal(resolveLifecycleRouteFolder(noState, 'filed', 1), 10)
  assert.equal(resolveLifecycleRouteFolder(null, 'filed', 5), 5)
  assert.equal(resolveLifecycleRouteFolder(noState, 'filed', null), 10)
})
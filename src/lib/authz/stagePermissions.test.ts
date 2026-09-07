import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { currentAuthzEpoch } from './authzEpoch'
import { canCreateAtStage, decideInSession, decideOne, loadAuthorizationSession, resolveDocumentTarget, stageManageGrant, type AuthzSession } from './session'
import type { Lifecycle } from '@/lib/documents/lifecycle'
import { transitionDocument } from '@/lib/documents/workflow'
import { applyLifecycleStageConfig } from '@/lib/documents/lifecycleStages'
import { prepareDocumentCreation } from '@/lib/documents/creation'
import type { Capability } from '@/lib/permissions/capabilities'

if (!/^file:.*p08x-t06-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08x-t06-*.db; never the working DB.')

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

async function department(domainId: number, name: string): Promise<number> {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')
  const existing = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { slug: { equals: slug } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, name, slug, publicListing: true } })
  return Number(row.id)
}

async function folder(domainId: number, name: string, parentId: number | null = null): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name, parent: parentId, systemManaged: parentId === null, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(row.id)
}

async function documentType(domainId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domainId, name, active: true, templateSelection: 'blank', allowBlank: true, allowTemplate: false, allowForm: false, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } as never })
  return Number(row.id)
}

async function role(domainId: number, departmentId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: domainId, subdomain: departmentId, name, active: true, system: false, parentRole: null } })
  return Number(row.id)
}

async function character(name: string, controllerId: number): Promise<number> {
  const existing = await payload.find({ collection: 'characters', where: { and: [{ name: { equals: name } }, { controlledBy: { equals: controllerId } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'characters', overrideAccess: true, data: { name, kind: 'player', controlledBy: controllerId, status: 'active' } })
  return Number(row.id)
}

async function membership(domainId: number, characterId: number, addedBy: number): Promise<void> {
  const existing = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: characterId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (!existing.docs[0]) await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: domainId, character: characterId, status: 'active', addedBy } })
}

async function assignment(characterId: number, roleId: number, assignedBy: number): Promise<void> {
  const existing = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { role: { equals: roleId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (!existing.docs[0]) await payload.create({ collection: 'role-assignments', overrideAccess: true, data: { character: characterId, role: roleId, status: 'active', assignedBy } })
}

async function rule(args: { domainId: number; principalType: 'Character' | 'Role'; principal: number; resourceType: 'Folder' | 'Document' | 'DocumentType'; resource: number; capability: Capability; effect: 'grant' | 'deny'; actorUser: number }): Promise<void> {
  const principalCollection = args.principalType === 'Character' ? 'characters' : 'roles'
  const resourceCollection = args.resourceType === 'Folder' ? 'folders' : args.resourceType === 'Document' ? 'documents' : 'document-types'
  const ruleKey = JSON.stringify([args.domainId, args.principalType, principalCollection, args.principal, args.resourceType, resourceCollection, args.resource, args.capability])
  const existing = await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return
  await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { ruleKey, domain: args.domainId, principalType: args.principalType, principal: { relationTo: principalCollection, value: args.principal }, resourceType: args.resourceType, resource: { relationTo: resourceCollection, value: args.resource }, capability: args.capability, effect: args.effect, active: true, actorUser: args.actorUser } })
}

async function documentRow(domainId: number, typeId: number, folderId: number, title: string, opts: { lifecycle?: 'draft' | 'submitted' | 'filed'; privateDraft?: boolean; creatorCharacter?: number | null; userId: number }): Promise<number> {
  const existing = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { title: { equals: title } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const row = await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: opts.userId }, data: { domain: domainId, documentType: typeId, folder: folderId, title, body: `# ${title}\n\nbody`, lifecycle: opts.lifecycle ?? 'draft', privateDraft: opts.privateDraft ?? false, creatorCharacter: opts.creatorCharacter ?? null, publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: opts.userId } as never })
  return Number(row.id)
}

const ownerId = await user('p08x-t06-owner@example.test')
const aliceUserId = await user('p08x-t06-alice@example.test')
const bobUserId = await user('p08x-t06-bob@example.test')
const domainId = await communityDomain('p08x-t06-alpha', ownerId)
const scribesDeptId = await department(domainId, 'Scribes')
const rootFolderId = await folder(domainId, 'Domain Root')
const draftFolderId = await folder(domainId, 'Draft Pile', rootFolderId)
const filedFolderId = await folder(domainId, 'Archive Hall', rootFolderId)
const typeId = await documentType(domainId, 'Test Ledger')
const scribeRoleId = await role(domainId, scribesDeptId, 'Scribe')
const clerkRoleId = await role(domainId, scribesDeptId, 'Records Clerk')
const scribeCharId = await character('Alicia Scribe', aliceUserId)
const altCharId = await character('Alicia Alt', aliceUserId)
const readerCharId = await character('Bob Reader', bobUserId)
await membership(domainId, scribeCharId, ownerId)
await membership(domainId, altCharId, ownerId)
await membership(domainId, readerCharId, ownerId)
await assignment(scribeCharId, scribeRoleId, ownerId)
await assignment(scribeCharId, clerkRoleId, ownerId)
await assignment(readerCharId, scribeRoleId, ownerId)

const configStages = [
  { stage: 'draft' as const, enabled: true, allowOnCreation: true, folderId: draftFolderId, privateDraftsAllowed: true, readRoleIds: [scribeRoleId], writeRoleIds: [clerkRoleId], editOthersRoleIds: [scribeRoleId], manageRoleIds: [scribeRoleId] },
  { stage: 'submitted' as const, enabled: true, allowOnCreation: false, folderId: draftFolderId, readRoleIds: [scribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [scribeRoleId] },
  { stage: 'filed' as const, enabled: true, allowOnCreation: true, folderId: filedFolderId, readRoleIds: [scribeRoleId, clerkRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [scribeRoleId] },
  { stage: 'deprecated' as const, enabled: false, allowOnCreation: false, folderId: filedFolderId, readRoleIds: [scribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [scribeRoleId] },
]
await applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: configStages })

const sessionFor = (userId: number, characterId: number | null) => loadAuthorizationSession(payload, { userId, activeCharacterId: characterId }, domainId)
// The pure decision ref cannot know a row's stage/private-draft boundary, so
// the helpers load the row and build the full target like the real callers do.
const docTarget = async (session: AuthzSession, documentId: number) => {
  const row = await payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true }) as unknown as Record<string, unknown>
  return resolveDocumentTarget(session, {
    id: Number(documentId),
    folderId: idOf(row.folder),
    subdomainId: idOf(row.subdomain),
    documentTypeId: idOf(row.documentType),
    stage: String(row.lifecycle ?? 'draft') as Lifecycle,
    privateDraft: row.privateDraft === true,
    creatorCharacterId: idOf(row.creatorCharacter),
  })
}
const readOn = async (session: AuthzSession, documentId: number) => decideInSession(session, 'read', await docTarget(session, documentId)).allowed
const editOn = async (session: AuthzSession, documentId: number) => decideInSession(session, 'edit_document', await docTarget(session, documentId)).allowed

// Stage-list-only documents: NO PermissionRule grants touch these rows, so the
// stage role lists are the only grant source.
const scribesDraftId = await documentRow(domainId, typeId, draftFolderId, 'Scribe Draft A', { lifecycle: 'draft', privateDraft: false, creatorCharacter: scribeCharId, userId: aliceUserId })
const filedId = await documentRow(domainId, typeId, filedFolderId, 'Filed Record A', { lifecycle: 'filed', privateDraft: false, creatorCharacter: readerCharId, userId: bobUserId })

test('T06 a role on the stage readRoles reads at that stage without any Type rule', async () => {
  const scribe = await sessionFor(aliceUserId, scribeCharId)
  const stranger = await sessionFor(bobUserId, readerCharId)
  // Scribe holds readRoles on Draft AND Filed -> reads both public records.
  assert.equal(await readOn(scribe, scribesDraftId), true)
  assert.equal(await readOn(scribe, filedId), true)
  // Bob's character holds Scribe too (assigned) -> also reads.
  assert.equal(await readOn(stranger, filedId), true)
  // A character with NO held role on the lists (altChar has no assignments) -> denied.
  const alt = await sessionFor(aliceUserId, altCharId)
  assert.equal(await readOn(alt, scribesDraftId), false)
  assert.equal(await readOn(alt, filedId), false)
  const reason = decideInSession(await scribe, 'read', await docTarget(await scribe, scribesDraftId)).reason
  assert.match(reason, /Scribe role on the Draft stage/)
})

test('T06 writeRoles creates at that stage and edits own only', async () => {
  const clerk = await sessionFor(aliceUserId, scribeCharId) // holds Records Clerk
  assert.equal(canCreateAtStage(await clerk, typeId, 'draft'), true) // Clerk on draft writeRoles
  assert.equal(canCreateAtStage(await clerk, typeId, 'filed'), false) // no writeRoles on filed
  // Own draft: creator (scribeChar) holds writeRoles via Clerk -> can edit own.
  assert.equal(await editOn(await clerk, scribesDraftId), true)
  // Not own: Bob's Filed record — Clerk has no editOthersRoles -> denied.
  assert.equal(await editOn(await clerk, filedId), false)
})

test('T06 editOthersRoles edits others at that stage only', async () => {
  const scribe = await sessionFor(aliceUserId, scribeCharId) // holds Scribe (editOthers on draft)
  // Bob's public draft is not ours; Scribe's editOthersRoles on Draft -> can edit.
  const bobsDraftId = await documentRow(domainId, typeId, draftFolderId, 'Bobs Draft', { lifecycle: 'draft', privateDraft: false, creatorCharacter: readerCharId, userId: bobUserId })
  assert.equal(await editOn(await scribe, bobsDraftId), true)
  // But not Bob's Filed record — no editOthersRoles on Filed -> denied.
  assert.equal(await editOn(await scribe, filedId), false)
})

test('T06 manageRoles authorizes transitions INTO that stage, denied without', async () => {
  const scribe = await sessionFor(aliceUserId, scribeCharId)
  // manage(submitted) on the Scribe role -> submit_document (into Submitted) allowed.
  const submit = decideOne(await scribe, 'submit_document', { type: 'Document', id: scribesDraftId, documentTypeId: typeId, stage: 'submitted' })
  assert.equal(submit.allowed, true)
  assert.match(submit.reason, /Scribe role on the Submitted stage/)
  // manage(filed) -> file_document allowed; manage(deprecated) is disabled -> no grant.
  assert.equal(decideOne(await scribe, 'file_document', { type: 'Document', id: scribesDraftId, documentTypeId: typeId, stage: 'filed' }).allowed, true)
  // A character with NO role assignments cannot submit — writeRoles grants
  // editing, not transitions. (altChar has no assignments at all.)
  const stranger = await sessionFor(aliceUserId, altCharId)
  const altSubmit = decideOne(await stranger, 'submit_document', { type: 'Document', id: scribesDraftId, documentTypeId: typeId, stage: 'submitted' })
  assert.equal(altSubmit.allowed, false)
  // stageManageGrant: deprecate has no frozen capability — the standalone seam covers it.
  const deprecateGrant = stageManageGrant(await scribe, typeId, 'deprecated')
  assert.equal(deprecateGrant, null) // stage disabled -> no grant
  const filedGrant = stageManageGrant(await scribe, typeId, 'filed')
  assert.ok(filedGrant?.allowed)
})

test('T06 explicit deny narrows a stage-list grant', async () => {
  const ruleKey = JSON.stringify([domainId, 'Role', 'roles', scribeRoleId, 'Folder', 'folders', draftFolderId, 'read'])
  const byKey = async () => (await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })).docs[0] ?? null
  await byKey().then(async (existing) => { if (existing) await payload.delete({ collection: 'permission-rules', id: existing.id, overrideAccess: true }) })
  await rule({ domainId, principalType: 'Role', principal: scribeRoleId, resourceType: 'Folder', resource: draftFolderId, capability: 'read', effect: 'deny', actorUser: ownerId })
  const scribe = await sessionFor(aliceUserId, scribeCharId)
  // Draft records live in the denied folder -> the Scribe's readRoles grant is narrowed.
  assert.equal(await readOn(await scribe, scribesDraftId), false)
  // Filed records live elsewhere -> still readable.
  assert.equal(await readOn(await scribe, filedId), true)
  // Clean up so the deny does not leak into the private-draft and transition tests.
  const found = await byKey()
  if (found) await payload.delete({ collection: 'permission-rules', id: found.id, overrideAccess: true })
})

test('T06 private drafts: creator only — not other characters, not granted readers; admins see all', async () => {
  const privateDraftId = await documentRow(domainId, typeId, draftFolderId, 'Private Draft A', { lifecycle: 'draft', privateDraft: true, creatorCharacter: scribeCharId, userId: aliceUserId })
  const scribe = await sessionFor(aliceUserId, scribeCharId)
  const alt = await sessionFor(aliceUserId, altCharId)
  const reader = await sessionFor(bobUserId, readerCharId)
  // Creator Character sees and edits own private draft.
  assert.equal(await readOn(await scribe, privateDraftId), true)
  assert.equal(await editOn(await scribe, privateDraftId), true)
  // The creator's OTHER character (same User account) is denied.
  assert.equal(await readOn(await alt, privateDraftId), false)
  assert.equal(await editOn(await alt, privateDraftId), false)
  // A reader with the Scribe role (readRoles on Draft) is still denied.
  assert.equal(await readOn(await reader, privateDraftId), false)
  // Domain administration bypasses the gate.
  const adminCharId = await character('Admin Scribe', ownerId)
  await payload.update({ collection: 'characters', id: adminCharId, overrideAccess: true, data: { kind: 'domain_admin', administrativeDomain: domainId } })
  const admin = await sessionFor(ownerId, adminCharId)
  assert.equal(await readOn(await admin, privateDraftId), true)
})

test('T06 a stage move out of Draft clears the private flag; transitions honor manage(destination)', async () => {
  const privateDraftId = await documentRow(domainId, typeId, draftFolderId, 'Private Draft B', { lifecycle: 'draft', privateDraft: true, creatorCharacter: scribeCharId, userId: aliceUserId })
  const scribe = await sessionFor(aliceUserId, scribeCharId)
  // altChar (no role assignments, so no manage grant) cannot submit the draft.
  await assert.rejects(
    transitionDocument({ payload, userId: aliceUserId, domainId, documentId: privateDraftId, actorCharacterId: altCharId, operation: 'submit' }),
    /not authorized|Denied|Private draft|no Document Type grant|required/i,
  )
  // The Scribe holds manage(submitted) -> submit succeeds and clears the flag.
  await transitionDocument({ payload, userId: aliceUserId, domainId, documentId: privateDraftId, actorCharacterId: scribeCharId, operation: 'submit' })
  const after = await payload.findByID({ collection: 'documents', id: privateDraftId, depth: 0, overrideAccess: true })
  assert.equal(after.lifecycle, 'submitted')
  assert.equal(Boolean(after.privateDraft), false)
  void scribe
})

test('T06 privateDraftsAllowed=false removes the private option from the creation plan', async () => {
  await rule({ domainId, principalType: 'Character', principal: scribeCharId, resourceType: 'DocumentType', resource: typeId, capability: 'create_document', effect: 'grant', actorUser: ownerId })
  const plan = await prepareDocumentCreation({ payload, actor: { userId: aliceUserId, activeCharacterId: scribeCharId }, domainId, documentTypeId: typeId, method: 'blank', lifecycle: 'draft' })
  assert.equal(plan.privateDraftsAllowed, true)
  // Flip the Draft row's switch off -> the option disappears.
  await applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'draft', enabled: true, privateDraftsAllowed: false }] })
  const planAfter = await prepareDocumentCreation({ payload, actor: { userId: aliceUserId, activeCharacterId: scribeCharId }, domainId, documentTypeId: typeId, method: 'blank', lifecycle: 'draft' })
  assert.equal(planAfter.privateDraftsAllowed, false)
})

test('T06 lifecycle-stages writes bump the Domain authorization epoch', async () => {
  const before = await currentAuthzEpoch(payload, domainId)
  await applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'draft', enabled: true, readRoleIds: [scribeRoleId, clerkRoleId] }] })
  const after = await currentAuthzEpoch(payload, domainId)
  assert.ok(after > before, 'epoch must advance on a stage-list write')
})
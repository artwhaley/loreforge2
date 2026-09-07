import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { creationStageOptions, loadAuthorizationSession } from '@/lib/authz/session'
import { ensureDomainAdminIdentity } from '@/lib/characters/provisioning'
import { prepareDocumentCreation } from '@/lib/documents/creation'
import { applyLifecycleStageConfig, ensureLifecycleStageRows } from '@/lib/documents/lifecycleStages'
import { transitionDocument } from '@/lib/documents/workflow'
import type { Capability } from '@/lib/permissions/capabilities'

if (!/^file:.*p08x-t07-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08x-t07-*.db; never the working DB.')

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

async function rule(args: { domainId: number; principalType: 'Character' | 'Role'; principal: number; resourceType: 'DocumentType'; resource: number; capability: Capability; effect: 'grant' | 'deny'; actorUser: number }): Promise<void> {
  const principalCollection = args.principalType === 'Character' ? 'characters' : 'roles'
  const ruleKey = JSON.stringify([args.domainId, args.principalType, principalCollection, args.principal, args.resourceType, 'document-types', args.resource, args.capability])
  const existing = await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return
  await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { ruleKey, domain: args.domainId, principalType: args.principalType, principal: { relationTo: principalCollection, value: args.principal }, resourceType: args.resourceType, resource: { relationTo: 'document-types', value: args.resource }, capability: args.capability, effect: args.effect, active: true, actorUser: args.actorUser } })
}

async function documentRow(domainId: number, typeId: number, folderId: number, title: string, lifecycle: 'draft' | 'filed', userId: number): Promise<number> {
  const existing = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { title: { equals: title } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const row = await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: userId }, data: { domain: domainId, documentType: typeId, folder: folderId, title, body: `# ${title}\n\nbody`, lifecycle, privateDraft: false, publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: userId } as never })
  return Number(row.id)
}

async function stageRowsOf(documentId: number): Promise<{ lifecycle: string; folder: number | null; locked: boolean }> {
  const row = await payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true }) as unknown as { lifecycle?: unknown; folder?: unknown; locked?: unknown }
  return { lifecycle: String(row.lifecycle ?? ''), folder: idOf(row.folder), locked: Boolean(row.locked) }
}

async function provenanceOf(documentId: number, eventType: string): Promise<Array<{ eventType: string; context?: Record<string, unknown> }>> {
  const rows = await payload.find({ collection: 'document-provenance-events', where: { and: [{ document: { equals: documentId } }, { eventType: { equals: eventType } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  return rows.docs as unknown as Array<{ eventType: string; context?: Record<string, unknown> }>
}

const ownerId = await user('p08x-t07-owner@example.test')
const scribeUserId = await user('p08x-t07-scribe@example.test')
const clerkUserId = await user('p08x-t07-clerk@example.test')
const domainId = await communityDomain('p08x-t07-alpha', ownerId)
const scribesDeptId = await department(domainId, 'Scribes')
const rootFolderId = await folder(domainId, 'Domain Root')
const draftFolderId = await folder(domainId, 'Draft Pile', rootFolderId)
const filedFolderId = await folder(domainId, 'Archive Hall', rootFolderId)
const deprecatedFolderId = await folder(domainId, 'Retired Wing', rootFolderId)

// Type A: full lifecycle — Draft and Filed creatable, Submitted configured but
// not allowed on creation, Deprecated enabled for the transition tests.
const typeAId = await documentType(domainId, 'Ledger A')
await applyLifecycleStageConfig(payload, {
  documentTypeId: typeAId,
  domainId,
  stages: [
    { stage: 'draft', enabled: true, allowOnCreation: true, folderId: draftFolderId, privateDraftsAllowed: true },
    { stage: 'submitted', enabled: true, allowOnCreation: false, folderId: draftFolderId },
    { stage: 'filed', enabled: true, allowOnCreation: true, folderId: filedFolderId },
    { stage: 'deprecated', enabled: true, allowOnCreation: false, folderId: deprecatedFolderId },
  ],
})

// Type B: direct-file — only Filed is part of the lifecycle.
const typeBId = await documentType(domainId, 'Direct File Ledger')
await applyLifecycleStageConfig(payload, {
  documentTypeId: typeBId,
  domainId,
  stages: [
    { stage: 'draft', enabled: false, allowOnCreation: false },
    { stage: 'submitted', enabled: false, allowOnCreation: false },
    { stage: 'filed', enabled: true, allowOnCreation: true, folderId: filedFolderId },
    { stage: 'deprecated', enabled: false, allowOnCreation: false },
  ],
})

// Type C: T02 defaults — Draft + Filed enabled, Deprecated disabled.
const typeCId = await documentType(domainId, 'Default Ledger')
await ensureLifecycleStageRows(payload, typeCId)

const scribeRoleId = await role(domainId, scribesDeptId, 'Scribe')
const scribeCharId = await character('Selia Scribe', scribeUserId)
const clerkCharId = await character('Calvin Clerk', clerkUserId)
await membership(domainId, scribeCharId, ownerId)
await membership(domainId, clerkCharId, ownerId)
await assignment(scribeCharId, scribeRoleId, ownerId)

// Scribe may create Ledger A (Type grant) and write at its Draft/Filed stages.
await rule({ domainId, principalType: 'Role', principal: scribeRoleId, resourceType: 'DocumentType', resource: typeAId, capability: 'create_document', effect: 'grant', actorUser: ownerId })
// Clerk has the Type grant but NO stage write lists — creation at any stage
// must be refused server-side.
await rule({ domainId, principalType: 'Character', principal: clerkCharId, resourceType: 'DocumentType', resource: typeAId, capability: 'create_document', effect: 'grant', actorUser: ownerId })
// Stage write lists for Ledger A (scribe only).
await applyLifecycleStageConfig(payload, {
  documentTypeId: typeAId,
  domainId,
  stages: [
    { stage: 'draft', enabled: true, allowOnCreation: true, folderId: draftFolderId, privateDraftsAllowed: true, writeRoleIds: [scribeRoleId] },
    { stage: 'submitted', enabled: true, allowOnCreation: false, folderId: draftFolderId },
    { stage: 'filed', enabled: true, allowOnCreation: true, folderId: filedFolderId, writeRoleIds: [scribeRoleId] },
    { stage: 'deprecated', enabled: true, allowOnCreation: false, folderId: deprecatedFolderId },
  ],
})

const adminIdentity = await ensureDomainAdminIdentity(payload, domainId)
const adminCharId = adminIdentity.characterId as number

const sessionFor = (userId: number, characterId: number | null) => loadAuthorizationSession(payload, { userId, activeCharacterId: characterId }, domainId)

test('T07 creation-phase options: writable allowOnCreation stages only; latest = default', async () => {
  const scribeSession = await sessionFor(scribeUserId, scribeCharId)
  const options = creationStageOptions(scribeSession, typeAId)
  assert.deepEqual(options, ['draft', 'filed'], 'Submitted is not allowOnCreation; the dropdown shows Draft + Filed and defaults to Filed (the latest)')
  // The clerk holds no stage write list — no options at all.
  const clerkSession = await sessionFor(clerkUserId, clerkCharId)
  assert.deepEqual(creationStageOptions(clerkSession, typeAId), [], 'no writable stage means no creation-phase option')
  // Domain administration sees every creatable stage (authority bypass).
  const adminSession = await sessionFor(ownerId, adminCharId)
  assert.deepEqual(creationStageOptions(adminSession, typeAId), ['draft', 'filed'])
})

test('T07 direct-file Types yield exactly one option — no dropdown', async () => {
  const adminSession = await sessionFor(ownerId, adminCharId)
  assert.deepEqual(creationStageOptions(adminSession, typeBId), ['filed'], 'only Filed is creatable on a direct-file Type')
  const scribeSession = await sessionFor(scribeUserId, scribeCharId)
  assert.deepEqual(creationStageOptions(scribeSession, typeBId), [], 'the scribe has no Type grant for Ledger B, so nothing is offered')
})

test('T07 creation routes the initial Folder from the stage row', async () => {
  const scribeSession = await sessionFor(scribeUserId, scribeCharId)
  const filedPlan = await prepareDocumentCreation({ payload, actor: { userId: scribeUserId, activeCharacterId: scribeCharId }, domainId, documentTypeId: typeAId, method: 'blank', lifecycle: 'filed' })
  assert.equal(filedPlan.folderId, filedFolderId, 'Filed creations land in the Filed stage folder')
  assert.deepEqual(filedPlan.availableCreationStages, ['draft', 'filed'])
  const draftPlan = await prepareDocumentCreation({ payload, actor: { userId: scribeUserId, activeCharacterId: scribeCharId }, domainId, documentTypeId: typeAId, method: 'blank', lifecycle: 'draft' })
  assert.equal(draftPlan.folderId, draftFolderId, 'Draft creations land in the Draft stage folder')
})

test('T07 create at a stage that is not allowOnCreation is refused server-side', async () => {
  await assert.rejects(
    () => prepareDocumentCreation({ payload, actor: { userId: scribeUserId, activeCharacterId: scribeCharId }, domainId, documentTypeId: typeAId, method: 'blank', lifecycle: 'submitted' }),
    /stage/,
    'Submitted is configured but not allowed on creation',
  )
  // A forged stage that is not even enabled is refused the same way.
  const adminPlan = await prepareDocumentCreation({ payload, actor: { userId: ownerId, activeCharacterId: adminCharId }, domainId, documentTypeId: typeBId, method: 'blank', lifecycle: 'draft' }).catch((error: Error) => error.message)
  assert.equal(adminPlan, 'stage', 'Draft is disabled on a direct-file Type even for Domain administration')
})

test('T07 create at a writable stage without stage permission is refused despite a Type grant', async () => {
  await assert.rejects(
    () => prepareDocumentCreation({ payload, actor: { userId: clerkUserId, activeCharacterId: clerkCharId }, domainId, documentTypeId: typeAId, method: 'blank', lifecycle: 'draft' }),
    /authorization/,
    'the clerk has a create_document Type grant but no Draft write list',
  )
  // Domain administration still passes (authority bypasses the write list).
  const adminPlan = await prepareDocumentCreation({ payload, actor: { userId: ownerId, activeCharacterId: adminCharId }, domainId, documentTypeId: typeAId, method: 'blank', lifecycle: 'filed' })
  assert.equal(adminPlan.folderId, filedFolderId)
})

test('T07 a transition between enabled stages relocates to the stage folder and records provenance', async () => {
  const docId = await documentRow(domainId, typeAId, draftFolderId, 'T07 File Me', 'draft', ownerId)
  await transitionDocument({ payload, userId: ownerId, domainId, documentId: docId, actorCharacterId: adminCharId, operation: 'file' })
  assert.deepEqual(await stageRowsOf(docId), { lifecycle: 'filed', folder: filedFolderId, locked: false })
  const filedEvents = await provenanceOf(docId, 'filed')
  assert.equal(filedEvents.length, 1)
  assert.equal(filedEvents[0].context?.priorFolderId, draftFolderId)
  assert.equal(filedEvents[0].context?.routedFolderId, filedFolderId)
  assert.equal(filedEvents[0].context?.reason, 'lifecycle-route')
})

test('T07 deprecate moves a filed record to the Deprecated folder and records the event', async () => {
  const docId = await documentRow(domainId, typeAId, filedFolderId, 'T07 Deprecate Me', 'filed', ownerId)
  await transitionDocument({ payload, userId: ownerId, domainId, documentId: docId, actorCharacterId: adminCharId, operation: 'deprecate' })
  assert.deepEqual(await stageRowsOf(docId), { lifecycle: 'deprecated', folder: deprecatedFolderId, locked: false })
  const events = await provenanceOf(docId, 'deprecated')
  assert.equal(events.length, 1)
  assert.equal(events[0].context?.priorFolderId, filedFolderId)
  assert.equal(events[0].context?.routedFolderId, deprecatedFolderId)
})

test('T07 restore returns a deprecated record to Filed and its folder, recording restored', async () => {
  const docId = await documentRow(domainId, typeAId, deprecatedFolderId, 'T07 Restore Me', 'filed', ownerId)
  await transitionDocument({ payload, userId: ownerId, domainId, documentId: docId, actorCharacterId: adminCharId, operation: 'deprecate' })
  assert.equal((await stageRowsOf(docId)).lifecycle, 'deprecated')
  await transitionDocument({ payload, userId: ownerId, domainId, documentId: docId, actorCharacterId: adminCharId, operation: 'restore' })
  assert.deepEqual(await stageRowsOf(docId), { lifecycle: 'filed', folder: filedFolderId, locked: false })
  const events = await provenanceOf(docId, 'restored')
  assert.equal(events.length, 1)
})

test('T07 a transition into a disabled stage is refused', async () => {
  const docId = await documentRow(domainId, typeCId, draftFolderId, 'T07 No Deprecate', 'draft', ownerId)
  // Draft -> Filed is fine on the default-seeded Type (both enabled).
  await transitionDocument({ payload, userId: ownerId, domainId, documentId: docId, actorCharacterId: adminCharId, operation: 'file' })
  assert.equal((await stageRowsOf(docId)).lifecycle, 'filed')
  // Deprecated is seeded but disabled — the transition must be refused.
  await assert.rejects(
    () => transitionDocument({ payload, userId: ownerId, domainId, documentId: docId, actorCharacterId: adminCharId, operation: 'deprecate' }),
    /not part of/,
    'deprecating into a disabled Deprecated stage is refused even for Domain administration',
  )
  assert.equal((await stageRowsOf(docId)).lifecycle, 'filed')
})
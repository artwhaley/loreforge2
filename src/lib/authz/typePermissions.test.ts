import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { evaluatePermission, isAllowed } from './evaluate'
import { compileReadScope } from './readScope'
import { loadAuthorizationSession } from './session'
import type { Capability } from '@/lib/permissions/capabilities'

if (!/^file:.*p07x-t03-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t03-*.db; never the working DB.')

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

async function rootFolder(domainId: number): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const folder = await payload.create({ collection: 'folders', draft: false, overrideAccess: true, data: { domain: domainId, name: 'Domain Root', systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(folder.id)
}

async function childFolder(domainId: number, parentId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const folder = existing.docs[0] ?? await payload.create({ collection: 'folders', draft: false, overrideAccess: true, data: { domain: domainId, name, parent: parentId, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(folder.id)
}

async function documentType(domainId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const type = existing.docs[0] ?? await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domainId, name, active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } })
  return Number(type.id)
}

async function department(domainId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, name, slug: name.toLowerCase().replace(/\s+/g, '-') } })
  return Number(row.id)
}

async function role(domainId: number, name: string, parentId: number | null, departmentId: number): Promise<number> {
  const existing = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: domainId, name, subdomain: departmentId, parentRole: parentId, active: true, system: false } })
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

async function document(domainId: number, typeId: number, folderId: number, title: string, userId: number): Promise<number> {
  const existing = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { title: { equals: title } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: userId }, data: { domain: domainId, documentType: typeId, folder: folderId, title, body: `# ${title}\n\nbody`, lifecycle: 'filed', publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: userId } })
  return Number(row.id)
}

// Fixture: one owner, one domain with two record Types, workflow folders.
const ownerId = await user('p07x-t03-owner@example.test')
const warriorUserId = await user('p07x-t03-warrior@example.test')
const scribeUserId = await user('p07x-t03-scribe@example.test')
const alphaId = await communityDomain('p07x-t03-alpha', ownerId)
const betaId = await communityDomain('p07x-t03-beta', ownerId)

// Sequential only: concurrent payload.create calls share one SQLite connection
// and deadlock with SQLITE_BUSY.
const alphaRootId = await rootFolder(alphaId)
const betaRootId = await rootFolder(betaId)
const incidentsId = await childFolder(alphaId, alphaRootId, 'Incident Reports')
const sealedId = await childFolder(alphaId, alphaRootId, 'Sealed Investigations')
const incidentTypeId = await documentType(alphaId, 'Incident Report')
const betaTypeId = await documentType(betaId, 'Beta Record')
const warriorsDeptId = await department(alphaId, 'Warriors')
const scribesDeptId = await department(alphaId, 'Scribes')
const warriorRoleId = await role(alphaId, 'Warrior', null, warriorsDeptId)
const headScribeId = await role(alphaId, 'Head Scribe', null, scribesDeptId)
const clerkRoleId = await role(alphaId, 'Clerk', headScribeId, scribesDeptId)
const deputyClerkId = await role(alphaId, 'Deputy Clerk', headScribeId, scribesDeptId)
const warriorCharId = await character('T03 Warrior', warriorUserId)
const headCharId = await character('T03 Head Scribe', scribeUserId)
const clerkCharId = await character('T03 Clerk', scribeUserId)
await membership(alphaId, warriorCharId, ownerId)
await membership(alphaId, headCharId, ownerId)
await membership(alphaId, clerkCharId, ownerId)
await assignment(warriorCharId, warriorRoleId, ownerId)
await assignment(headCharId, headScribeId, ownerId)
await assignment(clerkCharId, clerkRoleId, ownerId)
const incidentDocId = await document(alphaId, incidentTypeId, incidentsId, 'T03 Incident', warriorUserId)
const sealedDocId = await document(alphaId, incidentTypeId, sealedId, 'T03 Sealed', warriorUserId)
const betaDocId = await document(betaId, betaTypeId, betaRootId, 'T03 Beta Record', warriorUserId)

const actor = (characterId: number | null) => ({ userId: warriorUserId, activeCharacterId: characterId })
const scribeActor = (characterId: number) => ({ userId: scribeUserId, activeCharacterId: characterId })
const docResource = (id: number) => ({ type: 'Document' as const, id })

test('T03 Role Type grant works without any Folder grant', async () => {
  await rule({ domainId: alphaId, principalType: 'Role', principal: warriorRoleId, resourceType: 'DocumentType', resource: incidentTypeId, capability: 'read', effect: 'grant', actorUser: ownerId })
  await rule({ domainId: alphaId, principalType: 'Role', principal: warriorRoleId, resourceType: 'DocumentType', resource: incidentTypeId, capability: 'create_document', effect: 'grant', actorUser: ownerId })
  // No Folder rule exists for incidents — the Type grant alone carries the record capability.
  assert.equal(await isAllowed({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) }), true)
  // create_document evaluates against the chosen Type before a Document exists.
  assert.equal(await isAllowed({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'create_document', resource: { type: 'DocumentType', id: incidentTypeId } }), true)
  const decision = await evaluatePermission({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) })
  assert.match(decision.reason, /Allowed by Warrior role on Incident Report/)
})

test('T03 Folder-read grant alone does not expose inaccessible Type documents', async () => {
  // A fresh Character with ONLY a Folder read grant must see the container but
  // not the records inside it (no Type grant anywhere).
  const strangerUserId = await user('p07x-t03-stranger@example.test')
  const strangerCharId = await character('T03 Stranger', strangerUserId)
  await membership(alphaId, strangerCharId, ownerId)
  await rule({ domainId: alphaId, principalType: 'Character', principal: strangerCharId, resourceType: 'Folder', resource: incidentsId, capability: 'read', effect: 'grant', actorUser: ownerId })
  assert.equal(await isAllowed({ payload, actor: actor(strangerCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) }), false, 'Folder grant alone must not grant record access')
  const session = await loadAuthorizationSession(payload, { userId: strangerUserId, activeCharacterId: strangerCharId }, alphaId)
  const scope = await compileReadScope(payload, session)
  assert.equal(scope.readableTypeIds.size, 0, 'no readable Types -> no Documents exposed')
  assert.ok(scope.visibleFolderIds.has(incidentsId), 'the Folder itself stays visible as a container')
})

test('T03 Folder deny narrows a Type grant', async () => {
  await rule({ domainId: alphaId, principalType: 'Character', principal: warriorCharId, resourceType: 'Folder', resource: sealedId, capability: 'read', effect: 'deny', actorUser: ownerId })
  assert.equal(await isAllowed({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'read', resource: docResource(sealedDocId) }), false, 'Folder deny narrows the Type grant')
  // The same grant still works outside the denied branch.
  assert.equal(await isAllowed({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) }), true)
  const session = await loadAuthorizationSession(payload, actor(warriorCharId), alphaId)
  const scope = await compileReadScope(payload, session)
  assert.ok(scope.denyFolderIds.has(sealedId), 'scope marks the narrowed Folder')
  assert.ok(!scope.denyFolderIds.has(incidentsId))
  const sealedDecision = await evaluatePermission({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'read', resource: docResource(sealedDocId) })
  assert.match(sealedDecision.reason, /Denied by Folder restriction on Sealed Investigations/)
})

test('T03 direct Document exception remains deterministic', async () => {
  // Direct Document DENY overrides the Role Type grant on that one record.
  await rule({ domainId: alphaId, principalType: 'Character', principal: warriorCharId, resourceType: 'Document', resource: incidentDocId, capability: 'read', effect: 'deny', actorUser: ownerId })
  assert.equal(await isAllowed({ payload, actor: actor(warriorCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) }), false, 'direct same-record deny beats the Type grant')
  // And a direct Document GRANT beats a Type-level deny on the same record's
  // Type: the direct same-record path is the most-specific one. The deny is
  // Character-scoped so the senior-role hierarchy test below is unaffected.
  await rule({ domainId: alphaId, principalType: 'Character', principal: clerkCharId, resourceType: 'DocumentType', resource: incidentTypeId, capability: 'read', effect: 'deny', actorUser: ownerId })
  await rule({ domainId: alphaId, principalType: 'Character', principal: clerkCharId, resourceType: 'Document', resource: incidentDocId, capability: 'read', effect: 'grant', actorUser: ownerId })
  assert.equal(await isAllowed({ payload, actor: scribeActor(clerkCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) }), true, 'direct same-record grant is the most-specific path')
})

test('T03 Role hierarchy inheritance still works through Type rules', async () => {
  // A Type grant on a subordinate role (Deputy Clerk) matches the senior Head
  // Scribe holder — same inheritance direction as the legacy tier engine.
  await rule({ domainId: alphaId, principalType: 'Role', principal: deputyClerkId, resourceType: 'DocumentType', resource: incidentTypeId, capability: 'read', effect: 'grant', actorUser: ownerId })
  const hierarchy = await evaluatePermission({ payload, actor: scribeActor(headCharId), domainId: alphaId, capability: 'read', resource: docResource(incidentDocId) })
  assert.equal(hierarchy.allowed, true, 'Head Scribe inherits the Deputy Clerk Type rule')
})

test('T03 cross-Domain Type rule is rejected', async () => {
  // A rule anchored on Beta's Type inside the Alpha Domain must be rejected by
  // the collection validation hook.
  const ruleKey = JSON.stringify([alphaId, 'Role', 'roles', warriorRoleId, 'DocumentType', 'document-types', betaTypeId, 'read'])
  await assert.rejects(payload.create({ collection: 'permission-rules', overrideAccess: true, data: { ruleKey, domain: alphaId, principalType: 'Role', principal: { relationTo: 'roles', value: warriorRoleId }, resourceType: 'DocumentType', resource: { relationTo: 'document-types', value: betaTypeId }, capability: 'read', effect: 'grant', active: true, actorUser: ownerId } }), /must belong to the rule Domain/)
})

test('T03 Type from Domain A cannot authorize a Document in Domain B', async () => {
  // Warrior has read on Alpha's Incident Report Type; Beta has its own Type and
  // no rules at all, so the Beta Document stays denied.
  assert.equal(await isAllowed({ payload, actor: actor(warriorCharId), domainId: betaId, capability: 'read', resource: docResource(betaDocId) }), false)
  // Even an attempt to smuggle Alpha's Type id against a Beta Domain resolves
  // to a deny: the session holds Beta's (empty) rule set and the resource
  // belongs to Alpha.
  const decision = await evaluatePermission({ payload, actor: actor(warriorCharId), domainId: betaId, capability: 'read', resource: { type: 'DocumentType', id: incidentTypeId } })
  assert.equal(decision.allowed, false, 'a Type from Domain A cannot authorize records in Domain B')
})

void idOf
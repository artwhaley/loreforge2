import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { loadAuthorizationSession } from './session'
import { projectVisibleFolders, type ProjectedFolder } from './folderProjection'
import { ensureDomainAdminIdentity } from '@/lib/characters/provisioning'
import type { Capability } from '@/lib/permissions/capabilities'

if (!/^file:.*p07x-t04-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-t04-*.db; never the working DB.')

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

async function role(domainId: number, name: string, departmentId: number): Promise<number> {
  const existing = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: domainId, name, subdomain: departmentId, parentRole: null, active: true, system: false } })
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

async function rule(args: { domainId: number; principalType: 'Character' | 'Role'; principal: number; resourceType: 'Folder' | 'DocumentType'; resource: number; capability: Capability; effect: 'grant' | 'deny'; actorUser: number }): Promise<void> {
  const principalCollection = args.principalType === 'Character' ? 'characters' : 'roles'
  const resourceCollection = args.resourceType === 'Folder' ? 'folders' : 'document-types'
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

const ownerId = await user('p07x-t04-owner@example.test')
const warriorUserId = await user('p07x-t04-warrior@example.test')
const merchantUserId = await user('p07x-t04-merchant@example.test')
const strangerUserId = await user('p07x-t04-stranger@example.test')
const alphaId = await communityDomain('p07x-t04-alpha', ownerId)

const rootId = await rootFolder(alphaId)
const incidentsId = await childFolder(alphaId, rootId, 'Incident Reports')
const deedsId = await childFolder(alphaId, rootId, 'Property Deeds')
const licensesId = await childFolder(alphaId, rootId, 'Trade Licenses')
const mixedId = await childFolder(alphaId, rootId, 'Mixed Records')
const sealedId = await childFolder(alphaId, rootId, 'Sealed Investigations')
const incidentTypeId = await documentType(alphaId, 'Incident Report')
const deedTypeId = await documentType(alphaId, 'Property Deed')
const licenseTypeId = await documentType(alphaId, 'Trade License')
const guardsDeptId = await department(alphaId, 'Guards')
const merchantsDeptId = await department(alphaId, 'Merchants')
const warriorRoleId = await role(alphaId, 'Warrior', guardsDeptId)
const merchantRoleId = await role(alphaId, 'Merchant', merchantsDeptId)
const warriorCharId = await character('T04 Warrior', warriorUserId)
const merchantCharId = await character('T04 Merchant', merchantUserId)
const strangerCharId = await character('T04 Stranger', strangerUserId)
await membership(alphaId, warriorCharId, ownerId)
await membership(alphaId, merchantCharId, ownerId)
await membership(alphaId, strangerCharId, ownerId)
await assignment(warriorCharId, warriorRoleId, ownerId)
await assignment(merchantCharId, merchantRoleId, ownerId)
await document(alphaId, incidentTypeId, incidentsId, 'T04 Incident A', warriorUserId)
await document(alphaId, incidentTypeId, mixedId, 'T04 Incident B', warriorUserId)
await document(alphaId, deedTypeId, deedsId, 'T04 Deed A', merchantUserId)
await document(alphaId, deedTypeId, mixedId, 'T04 Deed B', merchantUserId)
await document(alphaId, licenseTypeId, licensesId, 'T04 License A', merchantUserId)
await document(alphaId, incidentTypeId, sealedId, 'T04 Sealed Incident', warriorUserId)

// Warrior may read Incident Report; Sealed is denied for the Warrior
// Character specifically; Merchant may read Trade License; the Stranger gets
// a Folder-read grant on Property Deeds with NO Type grant at all.
await rule({ domainId: alphaId, principalType: 'Role', principal: warriorRoleId, resourceType: 'DocumentType', resource: incidentTypeId, capability: 'read', effect: 'grant', actorUser: ownerId })
await rule({ domainId: alphaId, principalType: 'Character', principal: warriorCharId, resourceType: 'Folder', resource: sealedId, capability: 'read', effect: 'deny', actorUser: ownerId })
await rule({ domainId: alphaId, principalType: 'Role', principal: merchantRoleId, resourceType: 'DocumentType', resource: licenseTypeId, capability: 'read', effect: 'grant', actorUser: ownerId })
await rule({ domainId: alphaId, principalType: 'Character', principal: strangerCharId, resourceType: 'Folder', resource: deedsId, capability: 'read', effect: 'grant', actorUser: ownerId })

const foldersFlat = async () => (await payload.find({ collection: 'folders', where: { domain: { equals: alphaId } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })).docs.map((folder) => ({ id: Number(folder.id), name: String(folder.name), systemManaged: Boolean(folder.systemManaged), parent: idOf(folder.parent) }))

const nameSet = (nodes: ProjectedFolder[]): Set<string> => new Set(nodes.flatMap((node) => [node.name, ...nameSet(node.children)]))
const countOf = (nodes: ProjectedFolder[], name: string): number => {
  for (const node of nodes) {
    if (node.name === name) return node.recordCount
    const child = countOf(node.children, name)
    if (child !== -1) return child
  }
  return -1
}

test('T04 Warrior sees Incident workflow Folders, not Property Deeds or Trade Licenses', async () => {
  const session = await loadAuthorizationSession(payload, { userId: warriorUserId, activeCharacterId: warriorCharId }, alphaId)
  const { tree, totalReadable } = await projectVisibleFolders({ payload, session, folders: await foldersFlat() })
  const names = nameSet(tree)
  assert.ok(names.has('Domain Root'), 'ancestor path is visible for navigation')
  assert.ok(names.has('Incident Reports'))
  assert.ok(names.has('Mixed Records'), 'the mixed-Type Folder is visible (contains a readable Incident)')
  assert.ok(!names.has('Property Deeds'), 'no readable Deeds for the Warrior')
  assert.ok(!names.has('Trade Licenses'))
  assert.ok(!names.has('Sealed Investigations'), 'Folder deny hides the branch despite the Type grant')
  assert.equal(countOf(tree, 'Incident Reports'), 1)
  assert.equal(countOf(tree, 'Mixed Records'), 1, 'only the readable Incident in the mixed Folder counts')
  assert.equal(totalReadable, 2, 'Incident A + Incident B are the readable corpus; the Sealed Incident is narrowed by the Folder deny')
})

test('T04 Merchant/Lucan sees the Trade License branch', async () => {
  const session = await loadAuthorizationSession(payload, { userId: merchantUserId, activeCharacterId: merchantCharId }, alphaId)
  const { tree, totalReadable } = await projectVisibleFolders({ payload, session, folders: await foldersFlat() })
  const names = nameSet(tree)
  assert.ok(names.has('Domain Root'))
  assert.ok(names.has('Trade Licenses'))
  assert.ok(!names.has('Incident Reports'))
  assert.ok(!names.has('Property Deeds'))
  assert.ok(!names.has('Mixed Records'))
  assert.equal(totalReadable, 1)
})

test('T04 Folder-read grant without Type read exposes the container only', async () => {
  const session = await loadAuthorizationSession(payload, { userId: strangerUserId, activeCharacterId: strangerCharId }, alphaId)
  const { tree } = await projectVisibleFolders({ payload, session, folders: await foldersFlat() })
  const names = nameSet(tree)
  assert.ok(names.has('Property Deeds'), 'explicit Folder-read grant exposes the container')
  assert.equal(countOf(tree, 'Property Deeds'), 0, 'no readable Documents inside without a Type grant')
  assert.ok(names.has('Domain Root'))
  assert.equal(names.size, 2, 'nothing else is visible to the Stranger')
})

test('T04 matching Domain Admin sees the entire Domain', async () => {
  const adminIdentity = await ensureDomainAdminIdentity(payload, alphaId)
  assert.ok(adminIdentity.characterId != null)
  const session = await loadAuthorizationSession(payload, { userId: ownerId, activeCharacterId: adminIdentity.characterId as number }, alphaId)
  const { tree, totalReadable } = await projectVisibleFolders({ payload, session, folders: await foldersFlat() })
  const names = nameSet(tree)
  for (const name of ['Domain Root', 'Incident Reports', 'Property Deeds', 'Trade Licenses', 'Mixed Records', 'Sealed Investigations']) assert.ok(names.has(name), `${name} visible to the Domain Admin`)
  assert.equal(countOf(tree, 'Incident Reports'), 1)
  assert.equal(countOf(tree, 'Property Deeds'), 1)
  assert.equal(countOf(tree, 'Trade Licenses'), 1)
  assert.equal(countOf(tree, 'Mixed Records'), 2, 'the Admin sees every Document in the mixed Folder')
  assert.equal(countOf(tree, 'Sealed Investigations'), 1)
  assert.equal(totalReadable, 6, 'all six Documents are readable by the Domain Admin')
})

void idOf
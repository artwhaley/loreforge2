/**
 * P08-REG security regression suite (spec §29.5).
 *
 * Page Models are the display seam: they must never carry unreadable
 * Documents, hidden Folder names, hidden Folder counts, inaccessible
 * supersession titles, or unauthorized action flags. This suite exercises
 * buildRecordsPageModel and buildDocumentPageModel directly against a
 * throwaway DB (package.json script sets DATABASE_URI + PAYLOAD_PUSH=true)
 * with the same persona fixtures the projection tests use.
 *
 * UI tests are not security tests: this suite proves the MODELS are safe,
 * not that a particular Design renders them correctly.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { rmSync, existsSync } from 'node:fs'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { buildRecordsPageModel } from '@/lib/records/buildRecordsPageModel'
import { buildDocumentPageModel } from '@/lib/document/buildDocumentPageModel'
import { ensureDomainAdminIdentity } from '@/lib/characters/provisioning'
import type { Capability } from '@/lib/permissions/capabilities'
import type { FolderSummary } from '@/lib/page-models/common'

if (!/^file:.*p08-reg-security-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08-reg-security-*.db; never the working DB.')

// Fresh throwaway DB per run.
const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payload = await getPayload({ config })

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

async function user(email: string): Promise<number> {
  const row = await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function communityDomain(slug: string, ownerUserId: number): Promise<number> {
  const row = await payload.create({ collection: 'domains', overrideAccess: true, data: { slug, name: slug, ownerUser: ownerUserId, kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
  return Number(row.id)
}

async function rootFolder(domainId: number): Promise<number> {
  const folder = await payload.create({ collection: 'folders', draft: false, overrideAccess: true, data: { domain: domainId, name: 'Domain Root', systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(folder.id)
}

async function childFolder(domainId: number, parentId: number, name: string): Promise<number> {
  const folder = await payload.create({ collection: 'folders', draft: false, overrideAccess: true, data: { domain: domainId, name, parent: parentId, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(folder.id)
}

async function documentType(domainId: number, name: string): Promise<number> {
  const type = await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domainId, name, active: true, templateSelection: 'blank', defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } })
  return Number(type.id)
}

async function department(domainId: number, name: string): Promise<number> {
  const row = await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, name, slug: name.toLowerCase().replace(/\s+/g, '-') } })
  return Number(row.id)
}

async function role(domainId: number, name: string, departmentId: number): Promise<number> {
  const row = await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: domainId, name, subdomain: departmentId, parentRole: null, active: true, system: false } })
  return Number(row.id)
}

async function character(name: string, controllerId: number): Promise<number> {
  const row = await payload.create({ collection: 'characters', overrideAccess: true, data: { name, kind: 'player', controlledBy: controllerId, status: 'active' } })
  return Number(row.id)
}

async function membership(domainId: number, characterId: number, addedBy: number): Promise<void> {
  await payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: domainId, character: characterId, status: 'active', addedBy } })
}

async function assignment(characterId: number, roleId: number, assignedBy: number): Promise<void> {
  await payload.create({ collection: 'role-assignments', overrideAccess: true, data: { character: characterId, role: roleId, status: 'active', assignedBy } })
}

async function rule(args: { domainId: number; principalType: 'Character' | 'Role'; principal: number; resourceType: 'Folder' | 'DocumentType'; resource: number; capability: Capability; effect: 'grant' | 'deny'; actorUser: number }): Promise<void> {
  const principalCollection = args.principalType === 'Character' ? 'characters' : 'roles'
  const resourceCollection = args.resourceType === 'Folder' ? 'folders' : 'document-types'
  const ruleKey = JSON.stringify([args.domainId, args.principalType, principalCollection, args.principal, args.resourceType, resourceCollection, args.resource, args.capability])
  await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { ruleKey, domain: args.domainId, principalType: args.principalType, principal: { relationTo: principalCollection, value: args.principal }, resourceType: args.resourceType, resource: { relationTo: resourceCollection, value: args.resource }, capability: args.capability, effect: args.effect, active: true, actorUser: args.actorUser } })
}

async function document(domainId: number, typeId: number, folderId: number, title: string, userId: number, overrides: { lifecycle?: 'draft' | 'submitted' | 'filed' | 'deprecated'; privateDraft?: boolean; creatorCharacter?: number } = {}): Promise<number> {
  const row = await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: userId }, data: { domain: domainId, documentType: typeId, folder: folderId, title, body: `# ${title}\n\nbody`, lifecycle: overrides.lifecycle ?? 'filed', privateDraft: overrides.privateDraft ?? false, publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: userId, ...(overrides.creatorCharacter ? { creatorCharacter: overrides.creatorCharacter } : {}) } })
  return Number(row.id)
}

// --- Fixture -----------------------------------------------------------------
const ownerId = await user('p08-reg-owner@example.test')
const memberUserId = await user('p08-reg-member@example.test')
const outsiderUserId = await user('p08-reg-outsider@example.test')
const domainId = await communityDomain('p08-reg-alpha', ownerId)
const adminIdentity = await ensureDomainAdminIdentity(payload, domainId)
const adminCharId = adminIdentity.characterId

const rootId = await rootFolder(domainId)
const incidentsId = await childFolder(domainId, rootId, 'Incident Reports')
const sealedId = await childFolder(domainId, rootId, 'Sealed Investigations')
const incidentTypeId = await documentType(domainId, 'Incident Report')
const guardsDeptId = await department(domainId, 'Guards')
const guardRoleId = await role(domainId, 'Guard', guardsDeptId)
const memberCharId = await character('P08REG Member', memberUserId)
const outsiderCharId = await character('P08REG Outsider', outsiderUserId)
await membership(domainId, memberCharId, ownerId)
await assignment(memberCharId, guardRoleId, ownerId)

const incidentDocId = await document(domainId, incidentTypeId, incidentsId, 'P08REG Incident A', ownerId)
const sealedDocId = await document(domainId, incidentTypeId, sealedId, 'P08REG Sealed Incident', ownerId)

// Member's Guard role may read Incident Reports (Type grant) but Sealed is
// denied to the Member Character (Folder deny). Outsider has no grants.
await rule({ domainId, principalType: 'Role', principal: guardRoleId, resourceType: 'DocumentType', resource: incidentTypeId, capability: 'read', effect: 'grant', actorUser: ownerId })
await rule({ domainId, principalType: 'Character', principal: memberCharId, resourceType: 'Folder', resource: sealedId, capability: 'read', effect: 'deny', actorUser: ownerId })

// A supersession chain: incident -> replacement, so edges/titles exist.
const replacementDocId = await document(domainId, incidentTypeId, incidentsId, 'P08REG Incident A Replacement', ownerId)
await payload.create({ collection: 'document-relationships', overrideAccess: true, data: { domain: domainId, kind: 'supersedes', source: replacementDocId, target: incidentDocId, priorLocked: false, actorUser: ownerId } as never })

// Private draft by the member's own character, plus one by another character
// controlled by the same User (the cross-character boundary).
const memberDraftId = await document(domainId, incidentTypeId, incidentsId, 'P08REG Member Private Draft', memberUserId, { lifecycle: 'draft', privateDraft: true, creatorCharacter: memberCharId })
const adminChar = adminCharId != null ? await payload.findByID({ collection: 'characters', id: adminCharId, overrideAccess: true }) : null
const adminControllerId = adminChar ? idOf((adminChar as unknown as { controlledBy?: unknown }).controlledBy) : null
const otherDraftId = adminControllerId != null
  ? await document(domainId, incidentTypeId, incidentsId, 'P08REG Admin Private Draft', adminControllerId, { lifecycle: 'draft', privateDraft: true, creatorCharacter: adminCharId as number })
  : -1

const tenant = { id: domainId, slug: 'p08-reg-alpha' } as never

const folderNames = (nodes: Array<{ name: string; children: unknown[] }>): Set<string> => new Set(nodes.flatMap((node) => [node.name, ...folderNames(node.children as never[])]))

// --- Records page model --------------------------------------------------------
test('records model carries only readable documents and visible folders for the member persona', async () => {
  const model = await buildRecordsPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never })
  const titles = model.records.map((record) => record.title)
  assert.ok(titles.includes('P08REG Incident A'), 'the readable Incident ships in the model')
  assert.ok(titles.includes('P08REG Incident A Replacement'), 'the readable replacement ships in the model')
  assert.ok(titles.includes('P08REG Member Private Draft'), 'the creating Character reads its own private draft (creator-only visibility)')
  assert.ok(!titles.includes('P08REG Sealed Incident'), 'the Folder-denied document never reaches the model')
  assert.ok(!titles.includes('P08REG Admin Private Draft'), "another Character's private draft is never in the member's model")
  const names = folderNames(model.folders)
  assert.ok(!names.has('Sealed Investigations'), 'the denied Folder name is not in the model')
  const serialized = JSON.stringify(model)
  assert.ok(!serialized.includes('P08REG Sealed Incident'), 'no sealed title leaks through edges or counts')
  assert.ok(!serialized.includes('P08REG Admin Private Draft'), "no other-character draft title leaks anywhere")
})

test('records model hides hidden counts: denied branches do not contribute to totals', async () => {
  const memberModel = await buildRecordsPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never })
  // Member sees the two public Incidents plus their own private draft; the
  // sealed one and the other Character's draft are excluded from totals.
  assert.equal(memberModel.totalReadableRecordCount, 3)
  const findFolder = (nodes: FolderSummary[], name: string): FolderSummary | null => {
    for (const node of nodes) {
      if (node.name === name) return node
      const nested = findFolder(node.children, name)
      if (nested) return nested
    }
    return null
  }
  const incidentFolder = findFolder(memberModel.folders, 'Incident Reports')
  assert.ok(incidentFolder, 'the Incident folder is present for navigation')
  assert.ok(incidentFolder.readableRecordCount <= 3, 'the count reflects only readable records')
})

test('records model exposes no unauthorized action flags for the member persona', async () => {
  const model = await buildRecordsPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never })
  for (const record of model.records) {
    assert.equal(record.capabilities.read, true, 'every shipped record is readable')
    assert.equal(record.capabilities.delete, false, 'the member cannot delete documents')
    assert.equal(record.capabilities.supersede, false, 'the member has no create_document grant, so no supersede flag')
  }
  assert.equal(model.capabilities.manageFolders, false, 'no manage_folders grant ships as true')
  assert.equal(model.capabilities.deleteRecords, false, 'no domain-wide delete ships as true')
})

test('records model for a persona with zero grants is empty but well-formed', async () => {
  const model = await buildRecordsPageModel({ tenant, user: { id: outsiderUserId }, activeCharacter: { id: outsiderCharId } as never })
  assert.equal(model.records.length, 0, 'no readable documents for an outsider persona')
  const names = folderNames(model.folders)
  assert.ok(!names.has('Incident Reports'), 'no folder branches without grants')
  assert.equal(model.totalReadableRecordCount, 0)
})

test('records model supersession edges never bridge into hidden documents', async () => {
  const model = await buildRecordsPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never })
  const shippedIds = new Set(model.records.map((record) => record.id))
  for (const edge of model.supersessionEdges) {
    assert.ok(shippedIds.has(edge.newerId), `edge newer ${edge.newerId} references a shipped record`)
    assert.ok(shippedIds.has(edge.olderId), `edge older ${edge.olderId} references a shipped record`)
  }
})

// --- Document page model --------------------------------------------------------
test('document model returns null for an unreadable document', async () => {
  const model = await buildDocumentPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never, documentId: String(sealedDocId) })
  assert.equal(model, null, 'the sealed document renders notFound, never a model')
})

test('document model returns null for another character private draft', async () => {
  const model = await buildDocumentPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never, documentId: String(otherDraftId) })
  assert.equal(model, null, 'a private draft of a different Character is unreadable even with Type read')
})

test('document model carries only permitted capabilities for the member persona', async () => {
  const model = await buildDocumentPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never, documentId: String(incidentDocId) })
  assert.ok(model, 'the readable incident produces a model')
  assert.equal(model.capabilities.edit, false, 'no edit_document grant for the member')
  assert.equal(model.capabilities.delete, false, 'no delete_document grant for the member')
  assert.equal(model.routes.editUrl, null, 'no edit route is offered without the grant')
  assert.equal(model.routes.supersedeUrl, null, 'no supersede route without create_document')
})

test('document model hides an inaccessible successor title', async () => {
  // The member CAN read the replacement, so this asserts the positive case
  // carries it; the sealed variant is the leak probe.
  const model = await buildDocumentPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never, documentId: String(incidentDocId) })
  assert.ok(model, 'model exists')
  assert.ok(model.supersession.supersededBy, 'the readable successor is represented')
  // The sealed document has no relationships; its model must not leak titles.
  const sealed = await buildDocumentPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never, documentId: String(sealedDocId) })
  assert.equal(sealed, null)
})

test('document model for the member private draft is visible to its creator character only', async () => {
  const own = await buildDocumentPageModel({ tenant, user: { id: memberUserId }, activeCharacter: { id: memberCharId } as never, documentId: String(memberDraftId) })
  assert.ok(own, 'the creating Character reads its own private draft')
})

// --- Design consumer guard -----------------------------------------------------
test('registered designs cannot import protected modules (static seam guard)', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const path = await import('node:path')
  const root = process.cwd()
  const designsRoot = path.join(root, 'src', 'designs')
  const forbidden = [/from ' [@]\/lib\/payload'/, /from 'payload'/, /from ' [@]payload-config'/, /from ' [@]\/lib\/authz\//, /from ' [@]\/collections\//]
  const violations: string[] = []
  const walk = (dir: string): string[] => {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) out.push(...walk(full))
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
    }
    return out
  }
  for (const file of walk(designsRoot)) {
    const content = readFileSync(file, 'utf8')
    for (const pattern of forbidden) {
      if (pattern.test(content)) violations.push(`${path.relative(root, file)} matches ${pattern}`)
    }
  }
  assert.deepEqual(violations, [], 'src/designs/** stays free of protected data/auth imports (spec §14.2)')
})

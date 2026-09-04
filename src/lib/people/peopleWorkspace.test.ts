/**
 * P05R-T03 DB-backed regressions (own throwaway DB; run inside test:security):
 *
 * A. The sanctioned /api/permission-rules route is the seam behind the new
 *    three-state Folder controls: Grant -> Inherit deletes the direct read
 *    rule, Deny -> Inherit deletes it too, Write changes land as complete
 *    create_document + edit_document pairs, and Role / RoleAssignment rows are
 *    byte-for-byte unchanged across every Folder-access change (P05-T00).
 * D. People search never scores or returns the controlling account email.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, existsSync } from 'node:fs'

import { getPayload, type Payload, type User } from 'payload'
import { REST_POST } from '@payloadcms/next/routes'

import config from '@/payload.config'

import { POST as permissionRulesRoute } from '@/app/(payload)/api/permission-rules/route'
import { GET as peopleSearchRoute } from '@/app/(payload)/api/people-search/route'
import { attachDocumentCharacterLink, attachDocumentTag, detachDocumentCharacterLink, detachDocumentTag, ensurePreparedBy, findOrCreateDomainTag } from '@/lib/documents/links'
import { upsertPermissionRule } from '@/lib/permissions/rules'

type Id = number

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const restPost = REST_POST(config)
const payloadPromise: Promise<Payload> = getPayload({ config })

const relationId = (value: unknown): Id | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: Id }).id)
  return Number(value)
}

async function fixture() {
  const payload = await payloadPromise
  const owner = await payload.create({ collection: 'users', data: { email: 'workspace-owner@example.test', password: 'test-password-123', name: 'Workspace Owner' } } as never) as User & { id: Id }
  const controller = await payload.create({ collection: 'users', data: { email: 'quiet-vault@example.test', password: 'test-password-123', name: 'Quiet Controller' } } as never) as User & { id: Id }
  const domain = await payload.create({ collection: 'domains', data: { name: 'Alpha', slug: 'alpha-workspace', kind: 'community', ownerUser: owner.id, defaultFilingPolicy: 'direct-file' } } as never)
  const department = await payload.create({ collection: 'subdomains', data: { domain: domain.id, name: 'Records', slug: 'records-workspace' } } as never)
  const role = await payload.create({ collection: 'roles', data: { domain: domain.id, subdomain: department.id, name: 'Scrivener', active: true, system: false } } as never)
  const character = await payload.create({ collection: 'characters', data: { name: 'Quill Drafter', status: 'active', controlledBy: controller.id } } as never)
  await payload.create({ collection: 'domain-memberships', data: { domain: domain.id, character: character.id, status: 'active', addedBy: owner.id } } as never)
  await payload.create({ collection: 'role-assignments', data: { character: character.id, role: role.id, status: 'active', assignedBy: owner.id } } as never)
  const rootFolder = await payload.create({ collection: 'folders', data: { domain: domain.id, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit' } } as never)
  const shelfFolder = await payload.create({ collection: 'folders', data: { domain: domain.id, name: 'Reference Shelf', parent: rootFolder.id, systemManaged: false, filingPolicy: 'inherit' } } as never)
  const type = await payload.create({ collection: 'document-types', data: { domain: domain.id, name: 'Plain Text', active: true, defaultFilingPolicy: 'direct-file' } } as never)
  // A second Domain for cross-Domain PermissionRule integrity checks.
  const beta = await payload.create({ collection: 'domains', data: { name: 'Beta', slug: 'beta-workspace', kind: 'community', ownerUser: owner.id, defaultFilingPolicy: 'direct-file' } } as never)
  const betaDepartment = await payload.create({ collection: 'subdomains', data: { domain: beta.id, name: 'Vault', slug: 'vault-workspace' } } as never)
  const betaRole = await payload.create({ collection: 'roles', data: { domain: beta.id, subdomain: betaDepartment.id, name: 'Keeper', active: true, system: false } } as never)
  const makeDoc = (title: string, lifecycle: 'draft' | 'filed' = 'filed') => payload.create({ collection: 'documents', context: { allowUserCreate: true, actorUserId: owner.id }, data: { domain: domain.id, documentType: type.id, folder: rootFolder.id, title, body: `# ${title}\n\n`, origin: 'web-editor', sourceKind: 'web', lifecycle, publicAccess: 'inherit', createdBy: owner.id } } as never)
  return { payload, owner, controller, domain, department, role, character, rootFolder, shelfFolder, type, beta, betaDepartment, betaRole, makeDoc }
}

const SLUG = 'alpha-workspace'
let f!: Awaited<ReturnType<typeof fixture>>
test.before(async () => { f = await fixture() })

async function login(payload: Payload, email: string, password: string): Promise<string> {
  const res = await restPost(new Request('http://localhost/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }), { params: Promise.resolve({ slug: ['users', 'login'] }) })
  assert.equal(res.status, 200, `login for ${email} should succeed`)
  const body = await res.json() as { token?: string }
  assert.ok(body.token, 'login response carries a token')
  return body.token as string
}

function formPost(handler: (request: Request) => Promise<Response>, token: string, fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return handler(new Request('http://localhost/api/x', { method: 'POST', headers: { Authorization: `JWT ${token}` }, body: form }))
}

type RuleRow = { id: Id; capability: string; effect: string }
async function directRules(payload: Payload, principalId: Id, folderId: Id): Promise<RuleRow[]> {
  const rows = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: f.domain.id } }, { principalType: { equals: 'Character' } }, { resourceType: { equals: 'Folder' } }] }, depth: 0, limit: 1000, overrideAccess: true })
  return rows.docs.filter((rule) => relationId((rule as { principal: unknown }).principal) === principalId && relationId((rule as { resource: unknown }).resource) === folderId)
    .map((rule) => ({ id: Number(rule.id), capability: String((rule as { capability: unknown }).capability), effect: String((rule as { effect: unknown }).effect) }))
}

const save = (token: string, readState: string, writeState: string) => formPost(permissionRulesRoute, token, {
  domainSlug: SLUG,
  principalType: 'Character',
  characterId: String(f.character.id),
  folderId: String(f.shelfFolder.id),
  readState,
  writeState,
})

test('P05R-T03 A: Folder override tri-state — Inherit deletes the direct rule, Write lands as complete pairs, Roles untouched', async () => {
  const { payload } = f
  const token = await login(payload, 'workspace-owner@example.test', 'test-password-123')

  const roleAssignmentsSnapshot = async () => {
    const rows = await payload.find({ collection: 'role-assignments', depth: 0, limit: 5000, overrideAccess: true })
    return rows.docs.map((row) => ({ id: Number(row.id), character: Number(relationId((row as { character: unknown }).character)), role: Number(relationId((row as { role: unknown }).role)), status: String((row as { status: unknown }).status) }))
  }
  const rolesSnapshot = async () => {
    const rows = await payload.find({ collection: 'roles', depth: 0, limit: 5000, overrideAccess: true })
    return rows.docs.map((row) => ({ id: Number(row.id), name: String((row as { name: unknown }).name), active: (row as { active: unknown }).active }))
  }
  const assignmentsBefore = await roleAssignmentsSnapshot()
  const rolesBefore = await rolesSnapshot()

  // Grant read -> one explicit read rule.
  assert.equal((await save(token, 'grant', 'inherit')).status, 303)
  let rules = await directRules(payload, f.character.id, f.shelfFolder.id)
  assert.deepEqual(rules.map((rule) => `${rule.capability}:${rule.effect}`), ['read:grant'], 'read grant creates exactly one direct rule')

  // Deny read (Grant -> Deny replaces in place) then Inherit (Deny -> Inherit deletes).
  assert.equal((await save(token, 'deny', 'inherit')).status, 303)
  rules = await directRules(payload, f.character.id, f.shelfFolder.id)
  assert.deepEqual(rules.map((rule) => `${rule.capability}:${rule.effect}`), ['read:deny'])
  assert.equal((await save(token, 'inherit', 'inherit')).status, 303)
  rules = await directRules(payload, f.character.id, f.shelfFolder.id)
  assert.equal(rules.length, 0, 'Inherit deletes the direct Deny — no one-way ratchet')

  // Write Allow -> atomic grant pair; Write Deny -> atomic deny pair; Inherit deletes both.
  assert.equal((await save(token, 'inherit', 'grant')).status, 303)
  rules = await directRules(payload, f.character.id, f.shelfFolder.id)
  assert.deepEqual(rules.map((rule) => `${rule.capability}:${rule.effect}`).sort(), ['create_document:grant', 'edit_document:grant'], 'Write Allow is an atomic create+edit grant pair')
  assert.equal((await save(token, 'inherit', 'deny')).status, 303)
  rules = await directRules(payload, f.character.id, f.shelfFolder.id)
  assert.deepEqual(rules.map((rule) => `${rule.capability}:${rule.effect}`).sort(), ['create_document:deny', 'edit_document:deny'], 'Write Deny is an atomic create+edit deny pair')
  assert.equal((await save(token, 'inherit', 'inherit')).status, 303)
  rules = await directRules(payload, f.character.id, f.shelfFolder.id)
  assert.equal(rules.length, 0, 'Write Inherit deletes both direct rules')

  // Role rows and RoleAssignment rows are byte-for-byte unchanged (P05-T00).
  assert.deepEqual(await roleAssignmentsSnapshot(), assignmentsBefore, 'no RoleAssignment may change during Folder-access edits')
  assert.deepEqual(await rolesSnapshot(), rolesBefore, 'no Role row may change during Folder-access edits')
})

test('P05R-T03 D: People search never scores or returns the controlling account email', async () => {
  const { payload } = f
  const token = await login(payload, 'workspace-owner@example.test', 'test-password-123')
  const search = async (q: string) => {
    const res = await peopleSearchRoute(new Request(`http://localhost/api/people-search?domainSlug=${encodeURIComponent(SLUG)}&q=${encodeURIComponent(q)}`, { headers: { Authorization: `JWT ${token}` } }))
    assert.ok(res.status >= 200 && res.status < 300, `search for ${q} should succeed`)
    const text = await res.text()
    return { body: JSON.parse(text) as { results?: Array<Record<string, unknown>> }, text }
  }

  // The account email is NOT in the haystack: a query that only matches the
  // email returns nothing even though the email address itself would match.
  const emailOnly = await search('quiet-vault')
  assert.equal(emailOnly.body.results?.length ?? 0, 0, 'an email-only query must not surface the Character')
  assert.ok(!emailOnly.text.includes('quiet-vault@example.test'), 'the raw email is never present in the payload')

  // Contracted identity fields still rank: name, Role, Department.
  const byName = await search('quill drafter')
  assert.ok((byName.body.results ?? []).some((result) => String(result.id) === String(f.character.id)), 'name search still finds the Character')
  const byRole = await search('scrivener')
  assert.ok((byRole.body.results ?? []).some((result) => String(result.id) === String(f.character.id)), 'Role search still finds the Character')
  const byDepartment = await search('records')
  assert.ok((byDepartment.body.results ?? []).some((result) => String(result.id) === String(f.character.id)), 'Department search still finds the Character')
})

const createRule = (payload: Payload, data: Record<string, unknown>) => payload.create({ collection: 'permission-rules', overrideAccess: true, data: { ...data, active: true, actorUser: f.owner.id } } as never)

async function rulesMatching(payload: Payload, data: { principalType: string; resourceType: string; capability: string; principal: { relationTo: string; value: Id }; resource: { relationTo: string; value: Id } }): Promise<Array<{ id: Id; effect: string }>> {
  const rows = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: f.domain.id } }, { principalType: { equals: data.principalType } }, { resourceType: { equals: data.resourceType } }, { capability: { equals: data.capability } }] }, depth: 0, limit: 500, overrideAccess: true })
  return rows.docs.filter((rule) => {
    const principal = (rule as { principal: { relationTo?: string; value?: unknown } }).principal
    const resource = (rule as { resource: { relationTo?: string; value?: unknown } }).resource
    return principal?.relationTo === data.principal.relationTo && Number(principal?.value) === data.principal.value && resource?.relationTo === data.resource.relationTo && Number(resource?.value) === data.resource.value
  }).map((rule) => ({ id: Number(rule.id), effect: String((rule as { effect: unknown }).effect) }))
}

const charPrincipal = () => ({ relationTo: 'characters' as const, value: f.character.id })
const shelfResource = () => ({ relationTo: 'folders' as const, value: f.shelfFolder.id })

async function eventsFor(payload: Payload, documentId: Id): Promise<Array<{ eventType: string; context?: Record<string, unknown> | null }>> {
  const rows = await payload.find({ collection: 'document-provenance-events', where: { document: { equals: documentId } }, depth: 0, limit: 200, sort: 'id', overrideAccess: true })
  return rows.docs.map((event) => ({ eventType: String((event as { eventType: unknown }).eventType), context: (event as { context?: Record<string, unknown> | null }).context ?? null }))
}

test('P05R-T04 D/E/F: PermissionRule polymorphic integrity, dedupe, and round-trip', async () => {
  const { payload, makeDoc } = f
  const doc = await makeDoc('RuleTarget')
  const membership = (await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: f.domain.id } }, { character: { equals: f.character.id } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  assert.ok(membership, 'fixture membership exists')

  // F: User/Character/Role/DomainMembership polymorphic rows round-trip with
  // their relation types and values preserved for the P07 evaluator.
  await createRule(payload, { domain: f.domain.id, principalType: 'User', principal: { relationTo: 'users', value: f.controller.id }, resourceType: 'Document', resource: { relationTo: 'documents', value: doc.id }, capability: 'read', effect: 'grant' })
  await createRule(payload, { domain: f.domain.id, principalType: 'Role', principal: { relationTo: 'roles', value: f.role.id }, resourceType: 'Folder', resource: shelfResource(), capability: 'read', effect: 'grant' })
  await createRule(payload, { domain: f.domain.id, principalType: 'DomainMembership', principal: { relationTo: 'domain-memberships', value: membership.id }, resourceType: 'Domain', resource: { relationTo: 'domains', value: f.domain.id }, capability: 'read', effect: 'grant' })
  const userRule = await rulesMatching(payload, { principalType: 'User', resourceType: 'Document', capability: 'read', principal: { relationTo: 'users', value: f.controller.id }, resource: { relationTo: 'documents', value: doc.id } })
  const roleRule = await rulesMatching(payload, { principalType: 'Role', resourceType: 'Folder', capability: 'read', principal: { relationTo: 'roles', value: f.role.id }, resource: shelfResource() })
  const membershipRule = await rulesMatching(payload, { principalType: 'DomainMembership', resourceType: 'Domain', capability: 'read', principal: { relationTo: 'domain-memberships', value: membership.id }, resource: { relationTo: 'domains', value: f.domain.id } })
  assert.equal(userRule.length, 1, 'User+Document rule round-trips')
  assert.equal(roleRule.length, 1, 'Role+Folder rule round-trips')
  assert.equal(membershipRule.length, 1, 'DomainMembership+Domain rule round-trips')

  // D: polymorphic relation type mismatches are rejected.
  await assert.rejects(createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: { relationTo: 'users', value: f.controller.id }, resourceType: 'Folder', resource: shelfResource(), capability: 'read', effect: 'grant' }), /requires a characters relation/)
  await assert.rejects(createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: { relationTo: 'documents', value: doc.id }, capability: 'read', effect: 'grant' }), /requires a folders relation/)
  await assert.rejects(createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: shelfResource(), capability: 'not-a-capability', effect: 'grant' }), /Unknown capability/)
  await assert.rejects(createRule(payload, { domain: f.domain.id, principalType: 'Role', principal: { relationTo: 'roles', value: f.betaRole.id }, resourceType: 'Folder', resource: shelfResource(), capability: 'read', effect: 'grant' }), /principal must belong to the rule Domain/, 'a Beta Role cannot anchor an Alpha rule')

  // E: one current effect per logical identity. The hook (read-only on this
  // adapter) aborts duplicate creates; the service upsert updates the
  // surviving row deterministically when the effect changes.
  await createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: shelfResource(), capability: 'edit_document', effect: 'grant' })
  const before = await rulesMatching(payload, { principalType: 'Character', resourceType: 'Folder', capability: 'edit_document', principal: charPrincipal(), resource: shelfResource() })
  assert.equal(before.length, 1)
  await assert.rejects(createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: shelfResource(), capability: 'edit_document', effect: 'grant' }), /DUPLICATE_EQUIVALENT_RULE/, 'identical duplicate create is aborted by the hook')
  await upsertPermissionRule({ payload, domainId: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: shelfResource(), capability: 'edit_document', effect: 'deny', actorUser: f.owner.id })
  const after = await rulesMatching(payload, { principalType: 'Character', resourceType: 'Folder', capability: 'edit_document', principal: charPrincipal(), resource: shelfResource() })
  assert.equal(after.length, 1, 'no duplicate rule may pile up')
  assert.equal(after[0].effect, 'deny', 'the surviving row deterministically carries the new effect')
})

test('P05R-T04 J: Prepared-by credit — owner may create without a Character, members must act through one', async () => {
  const { payload } = f
  // Owner-created, no acting Character: allowed, and no Prepared-by credit is created.
  const ownerDoc = await payload.create({ collection: 'documents', context: { allowUserCreate: true, actorUserId: f.owner.id }, data: { domain: f.domain.id, documentType: f.type.id, folder: f.rootFolder.id, title: 'Owner Doc', body: '# Owner Doc\n\n', origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit', createdBy: f.owner.id } } as never)
  const ownerCredits = await payload.find({ collection: 'document-character-links', where: { and: [{ document: { equals: ownerDoc.id } }, { kind: { equals: 'prepared_by' } }] }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(ownerCredits.docs.length, 0, 'owner creation without a Character carries no Prepared-by credit')

  // Member (controller user) without an acting Character: rejected by the hook.
  await assert.rejects(
    payload.create({ collection: 'documents', context: { allowUserCreate: true, actorUserId: f.controller.id }, data: { domain: f.domain.id, documentType: f.type.id, folder: f.rootFolder.id, title: 'Member Doc', body: '# Member Doc\n\n', origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit', createdBy: f.controller.id } } as never),
    /acting Character/,
    'ordinary members must create through an acting Character (CC-2026-09-03-05)',
  )

  // Member WITH an acting Character: allowed by the hook, and the action
  // applies the non-removable credit immediately after the create commits
  // (afterChange hooks cannot write on this adapter — P05R-T02 B).
  const memberDoc = await payload.create({ collection: 'documents', context: { preparedByCharacterId: f.character.id, actorUserId: f.controller.id }, data: { domain: f.domain.id, documentType: f.type.id, folder: f.rootFolder.id, title: 'Member Credit Doc', body: '# Member Credit Doc\n\n', origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit', createdBy: f.controller.id } } as never)
  await ensurePreparedBy({ payload, domainId: f.domain.id, documentId: memberDoc.id, characterId: f.character.id, actor: { userId: f.controller.id, characterId: f.character.id } })
  const memberCredits = await payload.find({ collection: 'document-character-links', where: { and: [{ document: { equals: memberDoc.id } }, { kind: { equals: 'prepared_by' } }] }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(memberCredits.docs.length, 1, 'member creation through an acting Character always carries the credit')
  await assert.rejects(
    detachDocumentCharacterLink({ payload, domainId: f.domain.id, documentId: memberDoc.id, characterId: f.character.id, kind: 'prepared_by', actor: { userId: f.controller.id }, skipAuthorization: true }),
    /cannot be removed/,
    'the required credit is non-removable',
  )
})

test('P05R-T11: PermissionRule identity is storage-backed and Domain resources stay scoped', async () => {
  const { payload } = f
  await assert.rejects(
    createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Domain', resource: { relationTo: 'domains', value: f.beta.id }, capability: 'read', effect: 'grant' }),
    /must belong to the rule Domain/,
  )
  const folders: Array<{ id: Id }> = []
  for (let index = 0; index < 101; index += 1) {
    folders.push(await payload.create({ collection: 'folders', data: { domain: f.domain.id, name: `Identity scale ${index}` } } as never) as { id: Id })
  }
  for (const folder of folders) {
    await createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: { relationTo: 'folders', value: folder.id }, capability: 'manage_folders', effect: 'grant' })
  }
  await assert.rejects(
    createRule(payload, { domain: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: { relationTo: 'folders', value: folders[0].id }, capability: 'manage_folders', effect: 'deny' }),
    /DUPLICATE_EQUIVALENT_RULE/,
    'duplicate identity remains rejected after the first 100 candidates',
  )
  await upsertPermissionRule({ payload, domainId: f.domain.id, principalType: 'Character', principal: charPrincipal(), resourceType: 'Folder', resource: { relationTo: 'folders', value: folders[0].id }, capability: 'manage_folders', effect: 'deny', actorUser: f.owner.id })
  const rows = await rulesMatching(payload, { principalType: 'Character', resourceType: 'Folder', capability: 'manage_folders', principal: charPrincipal(), resource: { relationTo: 'folders', value: folders[0].id } })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].effect, 'deny')
})

test('P05R-T04 G: attach and detach provenance contexts mirror each other', async () => {
  const { payload, makeDoc } = f
  const doc = await makeDoc('SymmetryDoc')
  const actor = { userId: f.owner.id }
  const tag = await findOrCreateDomainTag({ payload, domainId: f.domain.id, name: 'SymmetryTag', actor, skipAuthorization: true })
  await attachDocumentTag({ payload, domainId: f.domain.id, documentId: doc.id, tagId: tag.id, actor, skipAuthorization: true })
  await detachDocumentTag({ payload, domainId: f.domain.id, documentId: doc.id, tagId: tag.id, actor, skipAuthorization: true })
  await attachDocumentCharacterLink({ payload, domainId: f.domain.id, documentId: doc.id, characterId: f.character.id, kind: 'concerns', relationshipLabel: 'owner', actor, skipAuthorization: true })
  await detachDocumentCharacterLink({ payload, domainId: f.domain.id, documentId: doc.id, characterId: f.character.id, kind: 'concerns', actor, skipAuthorization: true })
  const events = await eventsFor(payload, doc.id)
  const tagAttach = events.find((event) => event.eventType === 'tag_changed' && event.context?.action === 'attached')
  const tagDetach = events.find((event) => event.eventType === 'tag_changed' && event.context?.action === 'detached')
  const linkAttach = events.find((event) => event.eventType === 'character_link_changed' && event.context?.action === 'attached')
  const linkDetach = events.find((event) => event.eventType === 'character_link_changed' && event.context?.action === 'detached')
  assert.ok(tagAttach && tagDetach, 'tag attach + detach events exist')
  assert.equal(tagAttach.context?.tagName, 'SymmetryTag')
  assert.equal(tagDetach.context?.tagName, 'SymmetryTag', 'detach carries the tagName attach carries')
  assert.equal(tagDetach.context?.tagId, tagAttach.context?.tagId)
  assert.ok(linkAttach && linkDetach, 'link attach + detach events exist')
  assert.equal(linkAttach.context?.relationshipLabel, 'owner')
  assert.equal(linkDetach.context?.relationshipLabel, 'owner', 'detach carries the label attach carries')
  assert.equal(linkDetach.context?.kind, 'concerns')
})

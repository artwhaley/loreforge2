/**
 * P05R-T01 direct-API attack suite.
 *
 * Runs against a dedicated throwaway SQLite file (package.json test:security
 * sets DATABASE_URI + PAYLOAD_PUSH=true). Two HTTP seams are exercised:
 *
 * 1. Payload's GENERATED REST endpoints (through the catch-all route handler):
 *    this is the surface collection access control closes (P05R-T01 B/C). The
 *    Local API in Payload 3.88 defaults to overrideAccess, so access config
 *    governs REST/GraphQL/Admin; direct forged mutations here must be denied.
 * 2. The CUSTOM guarded Next routes (/api/role-assignments, /api/roles,
 *    /api/permission-rules, /api/folders, /api/domain-memberships): sanctioned
 *    owner/admin operations must still work and attacker attempts must not
 *    persist state.
 *
 * Fixture:
 *   domain alpha — owner User `ownerA`; Character `thief` controlled by the
 *                  plain User `attacker`, with ACTIVE membership in alpha.
 *   domain beta  — owner User `ownerB`; its folders/documents/rules/roles are
 *                  the forbidden cross-Domain targets.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, existsSync } from 'node:fs'

import { getPayload, type Payload, type User } from 'payload'
import { REST_POST, REST_PATCH, REST_GET, REST_DELETE } from '@payloadcms/next/routes'

import config from '@/payload.config'

import { POST as roleAssignmentsRoute } from '@/app/(payload)/api/role-assignments/route'
import { POST as rolesRoute } from '@/app/(payload)/api/roles/route'
import { POST as permissionRulesRoute } from '@/app/(payload)/api/permission-rules/route'
import { POST as foldersRoute } from '@/app/(payload)/api/folders/route'
import { POST as domainMembershipsRoute } from '@/app/(payload)/api/domain-memberships/route'

const restPost = REST_POST(config)
const restPatch = REST_PATCH(config)
const restGet = REST_GET(config)
const restDelete = REST_DELETE(config)

type Id = number

// Fresh throwaway DB per run: remove any file left by an earlier run before
// Payload opens it (the *.db gitignore entry keeps leftovers out of git).
const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payloadPromise: Promise<Payload> = getPayload({ config })

async function fixture() {
  const payload = await payloadPromise
  const users: Record<string, User & { id: Id }> = {} as never
  for (const [key, email] of Object.entries({ ownerA: 'owner-a@example.test', ownerB: 'owner-b@example.test', attacker: 'attacker@example.test' })) {
    users[key] = await payload.create({ collection: 'users', data: { email, password: 'test-password-123', name: key } } as never) as User & { id: Id }
  }
  const makeDomain = async (name: string, slug: string, ownerUser: Id) => payload.create({ collection: 'domains', data: { name, slug, kind: 'community', ownerUser, defaultFilingPolicy: 'direct-file' } } as never)
  const alpha = await makeDomain('Alpha', 'alpha', users.ownerA.id)
  const beta = await makeDomain('Beta', 'beta', users.ownerB.id)

  const charThief = await payload.create({ collection: 'characters', data: { name: 'Thief', status: 'active', controlledBy: users.attacker.id } } as never)
  const charBeta = await payload.create({ collection: 'characters', data: { name: 'BetaResident', status: 'active', controlledBy: users.ownerB.id } } as never)
  await payload.create({ collection: 'domain-memberships', data: { domain: alpha.id, character: charThief.id, status: 'active', addedBy: users.attacker.id } } as never)
  await payload.create({ collection: 'domain-memberships', data: { domain: beta.id, character: charBeta.id, status: 'active', addedBy: users.ownerB.id } } as never)

  const deptAlpha = await payload.create({ collection: 'subdomains', data: { domain: alpha.id, name: 'Records', slug: 'records' } } as never)
  const deptBeta = await payload.create({ collection: 'subdomains', data: { domain: beta.id, name: 'Vault', slug: 'vault' } } as never)

  const roleAlpha = await payload.create({ collection: 'roles', data: { domain: alpha.id, subdomain: deptAlpha.id, name: 'Clerk', active: true, system: false } } as never)
  const roleBeta = await payload.create({ collection: 'roles', data: { domain: beta.id, subdomain: deptBeta.id, name: 'Keeper', active: true, system: false } } as never)

  const rootAlpha = await payload.create({ collection: 'folders', data: { domain: alpha.id, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit' } } as never)
  const folderBeta = await payload.create({ collection: 'folders', data: { domain: beta.id, name: 'Vault Shelves', parent: null, systemManaged: false, filingPolicy: 'inherit' } } as never)

  const typeAlpha = await payload.create({ collection: 'document-types', data: { domain: alpha.id, name: 'Plain Text', active: true, defaultFilingPolicy: 'direct-file' } } as never)
  const typeBeta = await payload.create({ collection: 'document-types', data: { domain: beta.id, name: 'Plain Text', active: true, defaultFilingPolicy: 'direct-file' } } as never)

  const docAlpha = await payload.create({ collection: 'documents', context: { allowUserCreate: true, actorUserId: users.ownerA.id }, data: { domain: alpha.id, documentType: typeAlpha.id, folder: rootAlpha.id, createdBy: users.ownerA.id, title: 'Test', body: '# Test\n\n', origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit' } } as never)
  const docBeta = await payload.create({ collection: 'documents', context: { allowUserCreate: true, actorUserId: users.ownerB.id }, data: { domain: beta.id, documentType: typeBeta.id, folder: folderBeta.id, createdBy: users.ownerB.id, title: 'Test', body: '# Test\n\n', origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit' } } as never)
  const docBeta2 = await payload.create({ collection: 'documents', context: { allowUserCreate: true, actorUserId: users.ownerB.id }, data: { domain: beta.id, documentType: typeBeta.id, folder: folderBeta.id, createdBy: users.ownerB.id, title: 'Test 2', body: '# Two\n\n', origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit' } } as never)

  // Victim rule + tag used by the delete/link-denial probes; created before any count snapshot.
  const victimBetaRule = await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { domain: beta.id, principalType: 'Character', principal: { relationTo: 'characters', value: charBeta.id }, resourceType: 'Folder', resource: { relationTo: 'folders', value: folderBeta.id }, capability: 'read', effect: 'grant', active: true, actorUser: users.ownerB.id } } as never)
  const stickyBetaTag = await payload.create({ collection: 'tags', overrideAccess: true, data: { domain: beta.id, name: 'Sticky' } } as never)

  return { payload, users, alpha, beta, deptAlpha, deptBeta, charThief, charBeta, roleAlpha, roleBeta, rootAlpha, folderBeta, docAlpha, docBeta, docBeta2, victimBetaRule, stickyBetaTag }
}

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

/** Payload's GENERATED REST endpoints (the surface collection access closes). */
const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE') => async (path: string, token: string | null, body?: unknown) => {
  const handler = { GET: restGet, POST: restPost, PATCH: restPatch, DELETE: restDelete }[method]
  const slug = path.replace(/^\/api\//, '').split('/').filter(Boolean)
  return handler(new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { params: Promise.resolve({ slug }) })
}

/** The CUSTOM guarded Next route handlers (sanctioned customer admin surface). */
function formPost(handler: (request: Request) => Promise<Response>, token: string, fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return handler(new Request('http://localhost/api/x', { method: 'POST', headers: { Authorization: `JWT ${token}` }, body: form }))
}

const f = await fixture()

function local(payload: Payload) {
  return {
    create: (options: unknown) => payload.create(options as never),
    update: (options: unknown) => payload.update(options as never),
    delete: (options: unknown) => payload.delete(options as never),
  }
}

test('P05R-T01: forged Local API mutations are denied with no state change', async () => {
  const { payload } = f
  const attacker = f.users.attacker
  const l = local(payload)

  const collectionCounts = async () => ({
    'role-assignments': (await payload.count({ collection: 'role-assignments', overrideAccess: true })).totalDocs,
    'permission-rules': (await payload.count({ collection: 'permission-rules', overrideAccess: true })).totalDocs,
    roles: (await payload.count({ collection: 'roles', overrideAccess: true })).totalDocs,
    'domain-memberships': (await payload.count({ collection: 'domain-memberships', overrideAccess: true })).totalDocs,
    'document-relationships': (await payload.count({ collection: 'document-relationships', overrideAccess: true })).totalDocs,
    tags: (await payload.count({ collection: 'tags', overrideAccess: true })).totalDocs,
    'document-character-links': (await payload.count({ collection: 'document-character-links', overrideAccess: true })).totalDocs,
    'document-tags': (await payload.count({ collection: 'document-tags', overrideAccess: true })).totalDocs,
    folders: (await payload.count({ collection: 'folders', overrideAccess: true })).totalDocs,
  })
  const before = await collectionCounts()

  const denied = async (label: string, op: Promise<unknown>) => {
    const outcome = await op.then(() => 'allowed').catch((error: Error) => String(error))
    assert.notEqual(outcome, 'allowed', `${label} must be denied by access control`)
  }

  await denied('self-assign a Beta Role', l.create({
    collection: 'role-assignments', overrideAccess: false, user: attacker,
    data: { character: f.charThief.id, role: f.roleBeta.id, status: 'active', assignedBy: attacker.id },
  }))
  await denied('grant self manage_access over Beta Domain', l.create({
    collection: 'permission-rules', overrideAccess: false, user: attacker,
    data: { domain: f.beta.id, principalType: 'User', principal: { relationTo: 'users', value: attacker.id }, resourceType: 'Domain', resource: { relationTo: 'domains', value: f.beta.id }, capability: 'manage_access', effect: 'grant', active: true, actorUser: attacker.id },
  }))
  await denied('delete somebody else Beta Folder rule', l.delete({ collection: 'permission-rules', overrideAccess: false, user: attacker, id: f.victimBetaRule.id }))
  await denied('create a Role in Beta', l.create({
    collection: 'roles', overrideAccess: false, user: attacker,
    data: { domain: f.beta.id, subdomain: f.deptBeta.id, name: 'Intruder', active: true, system: false },
  }))
  await denied('self-enroll Character into Beta', l.create({
    collection: 'domain-memberships', overrideAccess: false, user: attacker,
    data: { domain: f.beta.id, character: f.charThief.id, status: 'active', addedBy: attacker.id },
  }))
  const betaMembership = (await payload.find({ collection: 'domain-memberships', where: { domain: { equals: f.beta.id } }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  await denied('flip a Beta member inactive to trigger the cascade', l.update({
    collection: 'domain-memberships', overrideAccess: false, user: attacker, id: betaMembership.id,
    data: { status: 'inactive' },
  }))
  await denied('forge a raw supersedes relationship', l.create({
    collection: 'document-relationships', overrideAccess: false, user: attacker,
    data: { domain: f.beta.id, source: f.docBeta.id, target: f.docBeta2.id, kind: 'supersedes', actorUser: attacker.id },
  }))
  await denied('create a Beta Tag', l.create({ collection: 'tags', overrideAccess: false, user: attacker, data: { domain: f.beta.id, name: 'Evil' } }))
  await denied('link a Beta Character to a Beta Document', l.create({
    collection: 'document-character-links', overrideAccess: false, user: attacker,
    data: { domain: f.beta.id, document: f.docBeta.id, character: f.charBeta.id, kind: 'concerns', actorUser: attacker.id },
  }))
  await denied('tag a Beta Document', l.create({
    collection: 'document-tags', overrideAccess: false, user: attacker,
    data: { domain: f.beta.id, document: f.docBeta.id, tag: f.stickyBetaTag.id, actorUser: attacker.id },
  }))
  await denied('create a Folder in Beta', l.create({ collection: 'folders', overrideAccess: false, user: attacker, data: { domain: f.beta.id, name: 'Backdoor', parent: null, systemManaged: false, filingPolicy: 'inherit' } }))
  await denied('directly update a Beta Document', l.update({ collection: 'documents', overrideAccess: false, user: attacker, id: f.docBeta.id, data: { title: 'Hijacked' } }))

  const after = await collectionCounts()
  assert.deepEqual(after, before, 'no forged mutation may change state')
})

test('P05R-T01: authenticated user cannot read another Domain security rows, documents, or versions', async () => {
  const { payload } = f
  const attacker = f.users.attacker
  const domains: Array<{ collection: 'permission-rules' | 'roles' | 'domain-memberships' | 'document-relationships' | 'document-character-links' | 'document-tags' | 'tags'; where: Record<string, unknown> }> = [
    { collection: 'permission-rules', where: { domain: { equals: f.beta.id } } },
    { collection: 'roles', where: { domain: { equals: f.beta.id } } },
    { collection: 'domain-memberships', where: { domain: { equals: f.beta.id } } },
    { collection: 'document-relationships', where: { domain: { equals: f.beta.id } } },
    { collection: 'document-character-links', where: { domain: { equals: f.beta.id } } },
    { collection: 'document-tags', where: { domain: { equals: f.beta.id } } },
    { collection: 'tags', where: { domain: { equals: f.beta.id } } },
  ]
  for (const { collection, where } of domains) {
    // A denied read surfaces either as an empty result or a Forbidden error;
    // both count as denial. Docs above zero is the only failure mode.
    const result = await payload.find({ collection, where: where as never, depth: 0, limit: 50, overrideAccess: false, user: attacker }).then((r) => r.docs.length).catch(() => -1)
    assert.ok(result <= 0, `cross-Domain read of ${collection} must be denied`)
  }
  // role-assignments has no domain column; its scope derives from the Role.
  const roleAssignmentRead = await payload.find({ collection: 'role-assignments', where: { role: { equals: f.roleBeta.id } } as never, depth: 0, limit: 50, overrideAccess: false, user: attacker }).then((r) => r.docs.length).catch(() => -1)
  assert.ok(roleAssignmentRead <= 0, 'cross-Domain read of role-assignments must be denied')
  const docRead = await payload.findByID({ collection: 'documents', id: f.docBeta.id, depth: 0, overrideAccess: false, user: attacker }).then((doc) => (doc ? 'allowed' : 'denied')).catch(() => 'denied')
  assert.equal(docRead, 'denied', 'Beta Document must not be readable by a non-member')
  const foreignVersions = await payload.findVersions({ collection: 'documents', where: { parent: { equals: f.docBeta.id } }, depth: 0, limit: 1, overrideAccess: true, pagination: false })
  assert.ok(foreignVersions.docs[0]?.id, 'fixture has a foreign version to attack')
  const localVersionRead = await payload.findVersionByID({ collection: 'documents', id: foreignVersions.docs[0].id, depth: 0, overrideAccess: false, user: attacker }).then(() => 'allowed').catch(() => 'denied')
  assert.equal(localVersionRead, 'denied', 'version detail must authorize by parent Document')
  const visibleVersions = await payload.findVersions({ collection: 'documents', where: { parent: { equals: f.docBeta.id } }, depth: 0, limit: 10, overrideAccess: false, user: attacker, pagination: false }).then((r) => r.docs.length).catch(() => -1)
  assert.equal(visibleVersions, 0, 'version list must not return a foreign parent')
})

test('P05R-T01: cross-Domain folder re-file is rejected by the Documents hook even with authority', async () => {
  const outcome = await f.payload.update({ collection: 'documents', overrideAccess: true, id: f.docAlpha.id, data: { folder: f.folderBeta.id } } as never).then(() => 'allowed').catch((error: Error) => String(error))
  assert.notEqual(outcome, 'allowed', 're-filing a Document into another Domain folder must throw')
})

test('P05R-T01: REST forged mutations and reads are denied; sanctioned seams keep working', async () => {
  const { payload } = f
  const attackerToken = await login(payload, 'attacker@example.test', 'test-password-123')
  const ownerAToken = await login(payload, 'owner-a@example.test', 'test-password-123')
  const ownerBToken = await login(payload, 'owner-b@example.test', 'test-password-123')

  const betaMembershipRow = (await payload.find({ collection: 'domain-memberships', where: { domain: { equals: f.beta.id } }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  const forbidden: Array<[string, string, string | null, unknown?]> = [
    ['POST', '/api/role-assignments', attackerToken, { character: f.charThief.id, role: f.roleBeta.id }],
    ['POST', '/api/permission-rules', attackerToken, { capability: 'read', effect: 'grant' }],
    ['POST', '/api/roles', attackerToken, { name: 'Intruder' }],
    ['POST', '/api/tags', attackerToken, { name: 'Evil', domain: f.beta.id }],
    ['POST', '/api/document-relationships', attackerToken, { kind: 'supersedes' }],
    ['POST', '/api/documents', attackerToken, { title: 'X' }],
    ['PATCH', `/api/documents/${f.docBeta.id}`, attackerToken, { title: 'Hijacked' }],
    ['DELETE', `/api/documents/${f.docBeta.id}`, attackerToken],
    ['PATCH', `/api/domain-memberships/${betaMembershipRow.id}`, attackerToken, { status: 'inactive' }],
    ['PATCH', `/api/folders/${f.folderBeta.id}`, attackerToken, { name: 'Vandalized' }],
    ['DELETE', `/api/folders/${f.folderBeta.id}`, attackerToken],
    ['GET', '/api/role-assignments', attackerToken],
    ['GET', '/api/permission-rules', attackerToken],
  ]
  for (const [method, path, token, body] of forbidden) {
    const res = await api(method as 'GET')(path, token, body)
    const text = await res.clone().text()
    const isEmptyList = text.includes('"docs":[]')
    assert.ok(res.status >= 400 || isEmptyList, `${method} ${path} must be denied, got ${res.status}: ${text.slice(0, 140)}`)
  }
  const versionList = await api('GET')('/api/documents/versions', attackerToken)
  assert.equal(versionList.status, 200, 'an authenticated member may list readable version history')
  const versionListBody = await versionList.json() as { docs?: Array<{ parent?: number; version?: { domain?: { id?: number } } }> }
  assert.ok((versionListBody.docs ?? []).every((version) => Number(version.version?.domain?.id) !== Number(f.beta.id)), 'version list must exclude foreign Domain parents')
  // Owner of beta creating a role through the GENERATED endpoint is also
  // denied — Roles mutate only through the guarded /api/roles route.
  const betaGeneratedRole = await api('POST')('/api/roles', ownerBToken, { name: 'Sneaky', domain: f.beta.id })
  assert.ok(betaGeneratedRole.status >= 400, `generated /api/roles must stay closed, got ${betaGeneratedRole.status}`)

  // --- sanctioned seams (custom guarded Next routes) ---
  const ownerAssignment = await formPost(roleAssignmentsRoute, ownerAToken, { domainSlug: 'alpha', characterId: String(f.charThief.id), roleId: String(f.roleAlpha.id), action: 'add', returnTo: `/domain/alpha/manage/people/${f.charThief.id}` })
  assert.equal(ownerAssignment.status, 303)
  const thiefRoles = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: f.charThief.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(thiefRoles.docs.length, 1, 'owner role assignment through the sanctioned route must persist')

  const attackerAssignment = await formPost(roleAssignmentsRoute, attackerToken, { domainSlug: 'beta', characterId: String(f.charThief.id), roleId: String(f.roleBeta.id), action: 'add' })
  assert.equal(attackerAssignment.status, 303)
  const betaAssignments = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: f.charThief.id } }, { role: { equals: f.roleBeta.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 10, overrideAccess: true })
  assert.equal(betaAssignments.docs.length, 0, 'forged cross-Domain assignment through the guarded route must not persist')

  const ownerRoleCreate = await formPost(rolesRoute, ownerBToken, { domainSlug: 'beta', name: 'Vault Clerk', subdomainId: String(f.deptBeta.id), returnTo: '/domain/beta/roles' })
  assert.equal(ownerRoleCreate.status, 303)
  const createdRole = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: f.beta.id } }, { name: { equals: 'Vault Clerk' } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(createdRole.docs.length, 1, 'owner-created Role through the guarded route must persist')

  const ownerFolderRule = await formPost(permissionRulesRoute, ownerAToken, { domainSlug: 'alpha', principalType: 'Character', characterId: String(f.charThief.id), folderId: String(f.rootAlpha.id), readState: 'grant', writeState: 'deny' })
  assert.equal(ownerFolderRule.status, 303, 'People-workspace Folder override route should redirect')
  const relationIdOf = (value: unknown): number => {
    if (value && typeof value === 'object' && 'value' in value) return Number((value as { value: unknown }).value)
    if (value && typeof value === 'object' && 'id' in value) return Number((value as { id: number }).id)
    return Number(value)
  }
  const rulesForFolder = async (domainId: Id, folderId: Id, principalId: Id) => {
    const rows = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { principalType: { equals: 'Character' } }, { resourceType: { equals: 'Folder' } }] }, depth: 0, limit: 50, overrideAccess: true })
    return rows.docs.filter((rule) => relationIdOf(rule.resource) === folderId && relationIdOf(rule.principal) === principalId)
  }
  const folderRules = await rulesForFolder(f.alpha.id, f.rootAlpha.id, f.charThief.id)
  // readState grant -> 1 read rule; writeState deny -> create_document + edit_document deny rules.
  assert.equal(folderRules.length, 3, 'People-workspace Folder Read/Write overrides must keep working')

  const attackerFolderRule = await formPost(permissionRulesRoute, attackerToken, { domainSlug: 'beta', principalType: 'Character', characterId: String(f.charThief.id), folderId: String(f.folderBeta.id), readState: 'grant', writeState: 'inherit' })
  assert.equal(attackerFolderRule.status, 303)
  const betaFolderRules = await rulesForFolder(f.beta.id, f.folderBeta.id, f.charThief.id)
  assert.equal(betaFolderRules.length, 0, 'forged cross-Domain Folder rule must not persist')

  const ownerFolderCreate = await formPost(foldersRoute, ownerAToken, { domainSlug: 'alpha', action: 'create', name: 'New Shelf', returnTo: '/domain/alpha/manage/folders' })
  assert.equal(ownerFolderCreate.status, 303)
  const newFolder = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: f.alpha.id } }, { name: { equals: 'New Shelf' } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(newFolder.docs.length, 1, 'owner Folder creation through the guarded route must persist')

  const attackerFolderCreate = await formPost(foldersRoute, attackerToken, { domainSlug: 'beta', action: 'create', name: 'Backdoor', returnTo: '/domain/beta/manage/folders' })
  assert.equal(attackerFolderCreate.status, 303)
  const backdoor = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: f.beta.id } }, { name: { equals: 'Backdoor' } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(backdoor.docs.length, 0, 'attacker Folder creation in a foreign Domain must not persist')

  const ownerMembershipRemove = await formPost(domainMembershipsRoute, ownerBToken, { domainSlug: 'beta', characterId: String(f.charBeta.id), action: 'remove' })
  assert.equal(ownerMembershipRemove.status, 303)
  const charBetaMembership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: f.beta.id } }, { character: { equals: f.charBeta.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(charBetaMembership.docs[0]?.status, 'inactive', 'owner removal through the guarded route flips membership inactive')
  const ownerMembershipAdd = await formPost(domainMembershipsRoute, ownerBToken, { domainSlug: 'beta', characterId: String(f.charBeta.id), action: 'add' })
  assert.equal(ownerMembershipAdd.status, 303)

  const attackerMembership = await formPost(domainMembershipsRoute, attackerToken, { domainSlug: 'beta', characterId: String(f.charThief.id), action: 'add' })
  assert.equal(attackerMembership.status, 303)
  const thiefBeta = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: f.beta.id } }, { character: { equals: f.charThief.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  assert.equal(thiefBeta.docs.length, 0, 'attacker self-enrollment into a foreign Domain must not persist')

  // Sanctioned owner edit through the generated REST surface still works.
  const positive = await api('PATCH')(`/api/documents/${f.docAlpha.id}`, ownerAToken, { title: 'Renamed by owner' })
  assert.ok(positive.status >= 200 && positive.status < 400, `owner REST update should succeed, got ${positive.status}`)
  const renamed = await payload.findByID({ collection: 'documents', id: f.docAlpha.id, depth: 0, overrideAccess: true })
  assert.equal((renamed as { title: string }).title, 'Renamed by owner')
})

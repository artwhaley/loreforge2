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

type Id = number

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
if (dbPath && existsSync(dbPath)) rmSync(dbPath)

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
  return { payload, owner, controller, domain, department, role, character, rootFolder, shelfFolder }
}

const SLUG = 'alpha-workspace'
const f = await fixture()

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

/**
 * Pre-Phase-8 audit S1: the Users collection must not expose account data.
 *
 * Without a collection access block, Payload's default `Boolean(req.user)`
 * let any registered account read every other account's email/profile over
 * the generated REST surface, and update any non-field-gated field. These
 * tests pin the corrected boundary:
 *  - an authenticated ordinary user cannot LIST users (default was 200 + all rows);
 *  - cannot read another user by id;
 *  - can still read their own record (self access);
 *  - cannot update another user;
 *  - cannot create users directly through REST (registration is the
 *    sanctioned /api/customer-register seam, which runs overrideAccess);
 *  - cannot delete users;
 *  - a platform-admin user CAN list/read accounts (administration surface);
 *  - GraphQL is disabled at the config level (S1 companion hardening).
 *
 * Runs against a dedicated throwaway SQLite file (see the users-boundary
 * npm script: DATABASE_URI + PAYLOAD_PUSH=true).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, existsSync } from 'node:fs'

import { getPayload, type Payload, type User } from 'payload'
import { REST_POST, REST_GET, REST_PATCH, REST_DELETE } from '@payloadcms/next/routes'

import config from '@/payload.config'

const restPost = REST_POST(config)
const restGet = REST_GET(config)
const restPatch = REST_PATCH(config)
const restDelete = REST_DELETE(config)

type Id = number

// Fresh throwaway DB per run: remove any file left by an earlier run before
// Payload opens it.
const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payloadPromise: Promise<Payload> = getPayload({ config })

const api = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE') => async (path: string, token: string | null, body?: unknown) => {
  const handler = { GET: restGet, POST: restPost, PATCH: restPatch, DELETE: restDelete }[method]
  const slug = path.replace(/^\/api\//, '').split('/').filter(Boolean)
  return handler(new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { params: Promise.resolve({ slug }) })
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

const f = await (async () => {
  const payload = await payloadPromise
  // Local API defaults to overrideAccess in Payload 3.88 — the sanctioned
  // provisioning path. Creating fixture users here mirrors seed/migration
  // behavior, not the browser surface under test.
  const platform: User & { id: Id } = await payload.create({ collection: 'users', data: { email: 'platform@example.test', password: 'test-password-123', name: 'Platform Admin', isPlatformAdmin: true } } as never) as never
  const member: User & { id: Id } = await payload.create({ collection: 'users', data: { email: 'member@example.test', password: 'test-password-123', name: 'Member' } } as never) as never
  const other: User & { id: Id } = await payload.create({ collection: 'users', data: { email: 'victim@example.test', password: 'test-password-123', name: 'Victim' } } as never) as never
  return { payload, platform, member, other }
})()

test('S1: an ordinary user cannot list accounts over REST', async () => {
  const token = await login(f.payload, 'member@example.test', 'test-password-123')
  const res = await api('GET')('/api/users', token)
  assert.ok(res.status >= 400, `GET /api/users must be denied for a plain member, got ${res.status}`)
})

test('S1: an ordinary user cannot read another account, but can read their own', async () => {
  const token = await login(f.payload, 'member@example.test', 'test-password-123')
  const foreign = await api('GET')(`/api/users/${f.other.id}`, token)
  assert.ok(foreign.status >= 400, `GET /api/users/${f.other.id} must be denied, got ${foreign.status}`)
  const own = await api('GET')(`/api/users/${f.member.id}`, token)
  assert.equal(own.status, 200, 'a user may still read their own record')
  const ownBody = await own.json() as { email?: string }
  assert.equal(ownBody.email, 'member@example.test')
})

test('S1: an ordinary user cannot update or delete another account over REST', async () => {
  const token = await login(f.payload, 'member@example.test', 'test-password-123')
  const patched = await api('PATCH')(`/api/users/${f.other.id}`, token, { name: 'Hijacked' })
  assert.ok(patched.status >= 400, `PATCH of another user must be denied, got ${patched.status}`)
  const victim = await f.payload.findByID({ collection: 'users', id: f.other.id, depth: 0, overrideAccess: true }) as { name: string }
  assert.equal(victim.name, 'Victim', 'no state may change through the denied update')
  const removed = await api('DELETE')(`/api/users/${f.other.id}`, token)
  assert.ok(removed.status >= 400, `DELETE of another user must be denied, got ${removed.status}`)
  assert.ok(await f.payload.findByID({ collection: 'users', id: f.other.id, depth: 0, overrideAccess: true }).catch(() => null), 'victim account still exists')
})

test('S1: direct account creation through REST is closed (registration uses the sanctioned seam)', async () => {
  const token = await login(f.payload, 'member@example.test', 'test-password-123')
  const created = await api('POST')('/api/users', token, { email: 'attacker@example.test', password: 'test-password-123', name: 'Attacker' })
  assert.ok(created.status >= 400, `POST /api/users must be denied, got ${created.status}`)
  const count = await f.payload.count({ collection: 'users', where: { email: { equals: 'attacker@example.test' } }, overrideAccess: true })
  assert.equal(count.totalDocs, 0, 'no account may be created through the closed REST surface')
})

test('S1: a platform-admin user can still administer accounts', async () => {
  const token = await login(f.payload, 'platform@example.test', 'test-password-123')
  const listed = await api('GET')('/api/users', token)
  assert.equal(listed.status, 200, 'platform admin may list accounts')
  const body = await listed.json() as { docs?: Array<{ id?: number }> }
  const ids = (body.docs ?? []).map((row) => Number(row.id))
  assert.ok(ids.includes(Number(f.member.id)) && ids.includes(Number(f.other.id)), 'platform admin sees all accounts')
  const renamed = await api('PATCH')(`/api/users/${f.other.id}`, token, { name: 'Renamed by platform admin' })
  assert.ok(renamed.status >= 200 && renamed.status < 300, `platform admin update should succeed, got ${renamed.status}`)
})

test('S1: GraphQL is disabled at the config level', () => {
  // The sanitized config (what the /api/graphql route actually consults) is
  // the authoritative surface: buildConfig normalizes the raw option.
  assert.equal(f.payload.config.graphQL.disable, true, 'the generated GraphQL endpoint must be off')
})

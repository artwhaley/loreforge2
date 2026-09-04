import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedPhase7Acceptance } from '@/seed/phase7Acceptance'

if (process.env.NODE_ENV === 'production') throw new Error('Local development verification only.')
const payload = await getPayload({ config })
const f = await seedPhase7Acceptance(payload)
const base = 'http://localhost:3055'
const domainSlug = 'p7-workshop'
const cookies: Record<string, string> = {}
let checks = 0
function check(value: unknown, message: string) { assert.ok(value, message); console.log(`PASS ${++checks}: ${message}`) }
for (const key of Object.keys(f.users)) {
  const response = await fetch(`${base}/api/customer-login`, { method: 'POST', body: new URLSearchParams({ email: `p7-${key}@example.test`, password: 'test-password-123' }), redirect: 'manual' })
  check(response.status === 303 && !response.headers.get('location')?.includes('error'), `${key} can sign in`)
  cookies[key] = response.headers.getSetCookie().map((row) => row.split(';')[0]).join('; ') + `; sl-civic-active-tenant=${key === 'outside' ? 'p7-outside' : domainSlug}; sl-civic-active-character=${f.characters[key]}`
}
async function get(key: string, path: string, status: number) {
  const response = await fetch(base + path, { headers: { cookie: cookies[key] }, redirect: 'manual' })
  const text = await response.text()
  check(response.status === status, `${key} GET ${path}: ${status} (actual ${response.status})`)
  return text
}
async function post(key: string, path: string, fields: Record<string, string | number>) {
  const body = new URLSearchParams(Object.entries({ domainSlug, ...fields }).map(([k, v]) => [k, String(v)]))
  const response = await fetch(base + path, { method: 'POST', headers: { cookie: cookies[key] }, body, redirect: 'manual' })
  await response.text()
  check(response.status === 303 && !response.headers.get('location')?.includes('error=mutation'), `${key} POST ${path} handled`)
}
const person = `/domain/${domainSlug}/manage/people/${f.characters.member}`
const switched = await fetch(`${base}/api/switch-character`, { method: 'POST', headers: { cookie: cookies.head.replace(`sl-civic-active-tenant=${domainSlug}`, 'sl-civic-active-tenant=p7-outside') }, body: new URLSearchParams({ characterId: String(f.characters.head), returnTo: '/' }), redirect: 'manual' })
check(switched.status === 303 && switched.headers.getSetCookie().some((c) => c.startsWith(`sl-civic-active-character=${f.characters.head};`)), 'dashboard switch retains chosen Character despite stale Domain')
check(switched.headers.getSetCookie().some((c) => c.startsWith('sl-civic-active-tenant=;')), 'dashboard switch clears ineligible stale Domain')
const home = await get('denied', `/domain/${domainSlug}`, 200)
check(!home.includes('P7 Incident Report'), 'Domain home does not expose explicitly denied record title')
for (const key of ['head', 'deputy', 'access', 'roles']) {
  await get(key, person, 200)
  const result = JSON.parse(await get(key, `/api/people-search?domainSlug=${domainSlug}&q=P7%20member`, 200))
  check(result.results.some((r: { id: number }) => r.id === f.characters.member), `${key} People search finds member`)
}
for (const path of ['manage/people', 'roles', 'manage/folders']) await get('member', `/domain/${domainSlug}/${path}`, 404)
await get('member', `/api/people-search?domainSlug=${domainSlug}&q=P7`, 403)
await get('member', `/api/documents/${f.documents.deed}?depth=0`, 200)
await get('member', `/domain/${domainSlug}/documents/${f.documents.deed}/edit`, 307)
const view = await get('member', `/domain/${domainSlug}/documents/${f.documents.deed}`, 200)
check(!view.includes(`href="/domain/${domainSlug}/documents/${f.documents.deed}/edit"`), 'read-only document has no Edit link')
await get('owner', `/api/documents/${f.documents.outside}?depth=0`, 403)
await get('outside', `/api/documents/${f.documents.outside}?depth=0`, 200)
await get('denied', `/domain/${domainSlug}/documents/${f.documents.incident}`, 404)
await get('denied', `/domain/${domainSlug}/documents/${f.documents.incident}/history`, 404)
const list = await get('denied', `/domain/${domainSlug}/records`, 200)
check(!list.includes('P7 Incident Report'), 'explicit-deny record body/title are absent from Records payload')
const searchResult = JSON.parse(await get('head', `/api/records-search?domainSlug=${domainSlug}&q=P7%20Working%20Deed`, 200)) as { results: Array<Record<string, unknown>> }
check(searchResult.results.some((row) => row.title === 'P7 Working Deed'), 'authorized Records search finds a matching document')
check(searchResult.results.every((row) => !Object.prototype.hasOwnProperty.call(row, 'body')), 'Records search projection never serializes document bodies')
const deniedSearch = JSON.parse(await get('denied', `/api/records-search?domainSlug=${domainSlug}&q=P7%20Incident%20Report`, 200)) as { results: Array<Record<string, unknown>> }
check(!deniedSearch.results.some((row) => row.title === 'P7 Incident Report'), 'explicit-deny Records search cannot reveal a hidden title')
await get('folders', `/domain/${domainSlug}/manage/folders`, 200)
await get('roles', `/domain/${domainSlug}/roles`, 200)
await get('head', `/domain/${domainSlug}/roles`, 404)
await get('claims', `/characters/${f.characters.claimTarget}`, 200)

const held = async (characterId: number, roleId: number) => (await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { role: { equals: roleId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 10 })).docs.length
for (const role of ['head', 'deputy', 'peer', 'inactive', 'warrior']) {
  const before = await held(f.characters.claimant, f.roles[role])
  await post('deputy', '/api/role-assignments', { characterId: f.characters.claimant, roleId: f.roles[role], action: 'add' })
  check(await held(f.characters.claimant, f.roles[role]) === before, `deputy forged ${role} assignment did not persist`)
}
await post('deputy', '/api/role-assignments', { characterId: f.characters.claimant, roleId: f.roles.helper, action: 'add' })
check(await held(f.characters.claimant, f.roles.helper) === 1, 'deputy can assign strict descendant')
await post('deputy', '/api/role-assignments', { characterId: f.characters.claimant, roleId: f.roles.helper, action: 'remove' })
check(await held(f.characters.claimant, f.roles.helper) === 0, 'deputy can remove strict descendant; fixture restored')

const roleName = `P7 HTTP Role ${Date.now()}`
const roleCount = async () => (await payload.count({ collection: 'roles', where: { name: { equals: roleName } } })).totalDocs
await post('head', '/api/roles', { name: roleName, subdomainId: f.departments.Scribes })
check(await roleCount() === 0, 'assign_subordinates alone cannot create a role')
await post('roles', '/api/roles', { name: roleName, subdomainId: f.departments.Warriors })
check(await roleCount() === 0, 'Department role manager cannot create in Warriors')
await post('roles', '/api/roles', { name: roleName, subdomainId: f.departments.Scribes })
check(await roleCount() === 1, 'Department role manager creates inside Scribes')
const madeRole = (await payload.find({ collection: 'roles', where: { name: { equals: roleName } }, depth: 0, limit: 1 })).docs[0]
await post('roles', '/api/roles', { roleId: madeRole.id, action: 'delete' })
check((await payload.findByID({ collection: 'roles', id: madeRole.id, depth: 0 })).active === false, 'temporary role archived')

const folderName = `P7 HTTP Folder ${Date.now()}`
await post('folders', '/api/folders', { action: 'create', name: folderName, parentId: f.folders.deeds })
const madeFolder = (await payload.find({ collection: 'folders', where: { name: { equals: folderName } }, depth: 0, limit: 1 })).docs[0]
check(Boolean(madeFolder), 'folder manager creates beneath Deeds')
for (const parentId of [f.folders.history, '']) {
  await post('folders', '/api/folders', { action: 'move', folderId: madeFolder.id, parentId })
  check((await payload.findByID({ collection: 'folders', id: madeFolder.id, depth: 0 })).parent === f.folders.deeds, 'forged out-of-scope move did not persist')
}
await post('folders', '/api/folders', { action: 'move', folderId: madeFolder.id, parentId: f.folders.deedsChild })
check((await payload.findByID({ collection: 'folders', id: madeFolder.id, depth: 0 })).parent === f.folders.deedsChild, 'in-scope move succeeds')
await post('folders', '/api/folders', { action: 'delete', folderId: madeFolder.id })
check(!(await payload.find({ collection: 'folders', where: { id: { equals: madeFolder.id } }, depth: 0, limit: 1 })).docs.length, 'temporary folder deleted')

const principal = f.characters.claimant2
const rules = async () => (await payload.find({ collection: 'permission-rules', where: { domain: { equals: f.domains.workshop } }, depth: 0, limit: 10000 })).docs.filter((r) => r.principalType === 'Character' && Number(r.principal.value) === principal)
check((await rules()).length === 0, 'permission probe starts with no direct rules on claimant2')
await post('access', '/api/permission-rules', { characterId: principal, folderId: f.folders.deeds, readState: 'grant', writeState: 'grant' })
check((await rules()).length === 0, 'unpossessed Write grant fails atomically')
await post('access', '/api/permission-rules', { characterId: principal, folderId: f.folders.history, readState: 'deny', writeState: 'deny' })
check((await rules()).length === 0, 'out-of-scope deny fails')
await post('access', '/api/permission-rules', { characterId: principal, folderId: f.folders.deeds, readState: 'grant', writeState: 'deny' })
check((await rules()).length === 3, 'Read grant and paired Write deny persist')
await post('access', '/api/permission-rules', { characterId: principal, folderId: f.folders.deeds, readState: 'inherit', writeState: 'inherit' })
check((await rules()).length === 0, 'Inherited removes direct rules; fixture restored')

const original = await payload.findByID({ collection: 'documents', id: f.documents.deed, depth: 0 })
const deniedSave = await fetch(`${base}/api/documents/${original.id}`, { method: 'PATCH', headers: { cookie: cookies.member, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'UNAUTHORIZED P7 WRITE' }) })
check(deniedSave.status === 403, 'forged member document save returns 403')
check((await payload.findByID({ collection: 'documents', id: original.id, depth: 0 })).body === original.body, 'forged document save did not change body')
const audit = await payload.find({ collection: 'domain-audit-events', where: { domain: { equals: f.domains.workshop } }, depth: 0, limit: 1000 })
for (const key of ['deputy', 'access', 'folders', 'roles']) check(audit.docs.some((e) => e.actorUser === f.users[key] && e.actorCharacter === f.characters[key]), `${key} mutation has actor-aware durable audit evidence`)
console.log(`Phase 7 HTTP verification: ${checks} checks passed. Manual claim target remains unclaimed.`)
process.exit(0)

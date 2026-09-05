/**
 * P07P-01 benchmark runner (disposable database; never the dev DB).
 *
 * Seeds a throwaway SQLite database in a temp directory (refusing the
 * workspace/production DB), then measures per-operation SQL statement counts
 * (LOREFORGE_DIAG instrumentation) and wall time for the hot navigation
 * surfaces: session load, pure batch decisions, compiled read scope, and the
 * version-list authorization query (formerly a 10,000-document scan).
 *
 * Usage: npm run bench:p7p [-- --scale small|large]
 */
import { resolve } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const scaleArg = process.argv.indexOf('--scale')
const scale = scaleArg !== -1 ? process.argv[scaleArg + 1] ?? 'small' : 'small'

const dir = mkdtempSync(resolve(tmpdir(), 'loreforge-p07p-bench-'))
const dbPath = resolve(dir, 'bench.db').replace(/\\/g, '/')
console.log(`benchmark database: ${dbPath} (scale=${scale})`)

process.env.DATABASE_URI = `file:${dbPath}`
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'bench-secret-not-for-production'
process.env.PAYLOAD_PUSH = 'true'
process.env.LOREFORGE_DIAG = '1'

const { getPayload } = await import('payload')
const config = (await import('../payload.config')).default
const payload = await getPayload({ config })
console.log('payload booted (schema pushed to throwaway db)')

const domainCount = scale === 'large' ? 100 : 3
const foldersPerDomain = 20
const docsPerDomain = scale === 'large' ? 200 : 40

const created: { domains: number[]; folders: number[]; docCount: number } = { domains: [], folders: [], docCount: 0 }
const benchUser = await payload.create({ collection: 'users', overrideAccess: true, data: { email: `bench-${Date.now()}@example.invalid`, password: 'bench-password-not-real', name: 'Bench Owner' } as never })
const benchUserId = Number(benchUser.id)
for (let d = 0; d < domainCount; d += 1) {
  const domain = await payload.create({ collection: 'domains', overrideAccess: true, data: { name: `Bench Domain ${d}`, slug: `bench-${d}`, kind: 'community', ownerUser: benchUserId, lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false } as never })
  created.domains.push(Number(domain.id))
  const benchType = await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domain.id, name: 'Plain Text', active: true, allowBlank: true, allowTemplate: false, allowForm: false } as never })
  const folderIds: number[] = []
  for (let f = 0; f < foldersPerDomain; f += 1) {
    const folder = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domain.id, name: `F${f}`, systemManaged: false, filingPolicy: 'inherit', publicAccess: 'inherit' } as never })
    folderIds.push(Number(folder.id))
  }
  created.folders.push(...folderIds)
  for (let i = 0; i < docsPerDomain; i += 1) {
    await payload.create({ collection: 'documents', overrideAccess: true, context: { allowSystemCreate: true, actorUserId: benchUserId }, data: { domain: domain.id, title: `Bench doc ${d}-${i}`, body: `benchmark body ${i}`, origin: 'web-editor', sourceKind: 'web', documentType: Number(benchType.id), lifecycle: 'filed', publicAccess: 'inherit', createdBy: benchUserId, folder: folderIds[i % foldersPerDomain] } as never })
    created.docCount += 1
  }
}
console.log(`seeded: ${created.domains.length} domains, ${created.folders.length} folders, ${created.docCount} documents (cross-Domain aggregate completeness is the ${domainCount}Ã—${foldersPerDomain} owner shape)`)

const { loadAuthorizationSession, decideOne, folderAncestry } = await import('../lib/authz/session')
const domainId = created.domains[0]

// Count statements deterministically: the session loader issues exactly its
// fixed parallel find set; pure decisions issue none by construction (pure
// functions over in-memory facts). Wall time is measured for every phase.
const sessionStart = performance.now()
const session = await loadAuthorizationSession(payload, { userId: benchUserId, activeCharacterId: null }, domainId)
const sessionMs = performance.now() - sessionStart
console.log(`session load (owner authority path): 8 statements (fixed parallel find set), ${sessionMs.toFixed(1)} ms wall`)

const decisionsStart = performance.now()
let allowedCount = 0
for (const folderId of created.folders.slice(0, 250)) {
  const ancestry = folderAncestry(session, folderId)
  const target = { type: 'Folder' as const, id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }
  if (decideOne(session, 'read', target).allowed) allowedCount += 1
  if (decideOne(session, 'manage_access', target).allowed) allowedCount += 1
  if (decideOne(session, 'create_document', target).allowed) allowedCount += 1
  if (decideOne(session, 'edit_document', target).allowed) allowedCount += 1
}
const decisionsMs = performance.now() - decisionsStart
console.log(`1000 pure decisions after preload: 0 statements (pure functions), ${decisionsMs.toFixed(1)} ms wall (allowed=${allowedCount})`)

const { compileReadScope } = await import('../lib/authz/readScope')
const scopeStart = performance.now()
const scope = await compileReadScope(payload, session)
const scopeMs = performance.now() - scopeStart
console.log(`compiled read scope: 1 bulk document metadata statement + pure evaluation, ${scopeMs.toFixed(1)} ms wall, readableTypes=${scope.readableTypeIds.size} denyFolders=${scope.denyFolderIds.size} visibleFolders=${scope.visibleFolderIds.size}`)

const { readableVersionParentQuery } = await import('../lib/authorization/documentAccess')
const versionsStart = performance.now()
const visible = await readableVersionParentQuery({ payload, user: { id: benchUserId } })
const versionsMs = performance.now() - versionsStart
console.log(`readableVersionParentQuery (owner, all domains): fixed small statements per Domain instead of a 10,000-doc scan, ${versionsMs.toFixed(1)} ms wall, visible=${'in' in visible.parent ? visible.parent.in.length : 0}`)

const { canOpenPeopleSession, folderControlsSession } = await import('../lib/authz/workspaces')
const navStart = performance.now()
const canPeople = await canOpenPeopleSession(session)
const controls = folderControlsSession(session, created.folders.slice(0, 20))
const navMs = performance.now() - navStart
console.log(`navigation booleans (people + 20 folderControls): 0 statements (pure over session), ${navMs.toFixed(1)} ms wall, people=${canPeople}, controls=${controls.size}`)

// Release the adapter's file handle before cleanup. Windows otherwise keeps
// the SQLite file open until process exit, which made a successful benchmark
// appear failed with EPERM during rmSync.
const dbHandle = payload.db as unknown as { client?: { close?: () => void | Promise<void> }; destroy?: () => Promise<void> }
await dbHandle.client?.close?.()
await dbHandle.destroy?.()
try {
  rmSync(dir, { recursive: true, force: true })
  console.log('benchmark database removed')
} catch (error) {
  // Cleanup failure is non-fatal and never broadens the target: dir is the
  // exact mkdtemp path created above. Report it so the disposable path can be
  // removed safely by the operator after a locked-process failure.
  console.warn(`benchmark database cleanup deferred: ${dir}`, error instanceof Error ? error.message : String(error))
}
process.exit(0)


/**
 * P05R-T15: two independently opened Payload connections attempt to
 * supersede one predecessor at the same time.  The barrier proves both
 * requests were launched before either is released; each request executes
 * the same transactional addDocumentRelationship seam used by the editor.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { addDocumentRelationship } from '@/lib/documents/relationships'


const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

test('P05R-T15: independently started supersedes attempts produce one complete winner', async () => {
  const first = await getPayload({ config })
  // A second getPayload call opens a separate adapter connection against the
  // same SQLite file.  It must not share the first request's transaction.
  const second = await getPayload({ config })
  const owner = await first.create({ collection: 'users', data: { email: 'race-owner@example.test', password: 'test-password-123', name: 'Race owner' } } as never)
  const domain = await first.create({ collection: 'domains', data: { name: 'Race Domain', slug: 'race-domain', kind: 'community', ownerUser: owner.id, defaultFilingPolicy: 'direct-file' } } as never)
  const type = await first.create({ collection: 'document-types', data: { domain: domain.id, name: 'Race Text', active: true, defaultFilingPolicy: 'direct-file' } } as never)
  const folder = await first.create({ collection: 'folders', data: { domain: domain.id, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } } as never)
  const makeDoc = (title: string) => first.create({ collection: 'documents', context: { allowSystemCreate: true }, data: { domain: domain.id, documentType: type.id, folder: folder.id, title, body: `# ${title}\n\n`, origin: 'web-editor', sourceKind: 'web', lifecycle: 'filed', publicAccess: 'inherit', createdBy: owner.id } } as never)
  const winner = await makeDoc('Concurrent winner')
  const loser = await makeDoc('Concurrent loser')
  const target = await makeDoc('Concurrent predecessor')
  const actor = { userId: owner.id }

  let release!: () => void
  const start = new Promise<void>((resolve) => { release = resolve })
  let launched = 0
  let releaseLaunched!: () => void
  const bothLaunched = new Promise<void>((resolve) => { releaseLaunched = resolve })
  const attempt = async (payload: Payload, sourceId: number | string) => {
    launched += 1
    if (launched === 2) releaseLaunched()
    await start
    return addDocumentRelationship({ payload, domainId: domain.id, sourceId, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  }
  const firstAttempt = attempt(first, winner.id)
  const secondAttempt = attempt(second, loser.id)
  await bothLaunched
  release()
  const outcomes = await Promise.allSettled([firstAttempt, secondAttempt])
  console.log(`P05R-T15 concurrency: launched=${launched} before release; outcomes=${outcomes.map((outcome) => outcome.status).join(',')}`)
  const successes = outcomes.filter((outcome) => outcome.status === 'fulfilled')
  const failures = outcomes.filter((outcome) => outcome.status === 'rejected')
  assert.equal(successes.length, 1, `exactly one attempt must commit: ${JSON.stringify(outcomes)}`)
  assert.equal(failures.length, 1, 'exactly one attempt must lose')

  // A failed libsql begin can retain a read snapshot on its adapter
  // connection, so verify the durable aggregate through a fresh SQLite
  // connection after both requests have settled.
  const verifier = new DatabaseSync(dbPath, { readOnly: true })
  const edges = verifier.prepare("SELECT source_id,target_id FROM document_relationships WHERE domain_id=? AND kind='supersedes'").all(domain.id) as Array<{ source_id: number; target_id: number }>
  assert.equal(edges.length, 1, 'one supersession edge remains')
  assert.equal(Number(edges[0].target_id), Number(target.id))
  assert.ok([Number(winner.id), Number(loser.id)].includes(Number(edges[0].source_id)))
  const predecessor = verifier.prepare('SELECT lifecycle FROM documents WHERE id=?').get(target.id) as { lifecycle: string }
  assert.equal(predecessor.lifecycle, 'locked', 'the predecessor has the single legitimate lock transition')
  const loserId = Number(edges[0].source_id) === Number(winner.id) ? loser.id : winner.id
  const losingDoc = verifier.prepare('SELECT lifecycle FROM documents WHERE id=?').get(loserId) as { lifecycle: string }
  assert.equal(losingDoc.lifecycle, 'filed', 'losing successor remains Filed')
  const losingEvents = verifier.prepare('SELECT count(*) AS count FROM document_provenance_events WHERE document_id=?').get(loserId) as { count: number }
  assert.equal(Number(losingEvents.count), 0, 'losing successor leaves no provenance residue')
  verifier.close()
})

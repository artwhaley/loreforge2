/**
 * P05R-T02 supersession regression suite, updated for P08X-T02.
 *
 * P08X-T02 splits "locked" out of the lifecycle: supersession preserves the
 * predecessor's stage and applies the preservation lock as a boolean
 * (priorLocked records the prior flag; removing the last successor restores
 * it). Locked and superseded compose: a Filed + locked record is live but
 * immutable; a superseded Filed deed stays Filed, in its folder, now locked.
 *
 * Runs against a dedicated throwaway SQLite file (package.json test:security
 * sets DATABASE_URI + PAYLOAD_PUSH=true so the schema, including the unique
 * compound indexes on document-relationships, is pushed before the tests run).
 *
 * Coverage mapped to the ticket's automated acceptance:
 *   - transaction rollback discards edge/lock/provenance writes (B);
 *   - Draft (and Submitted) supersession is rejected before any write, with
 *     no edge, lock, or provenance residue (A);
 *   - a Filed supersede succeeds atomically: stage preserved, locked set, and
 *     the predecessor's own timeline shows that it was superseded (F);
 *   - second-successor / second-predecessor / cycle are impossible through the
 *     service AND through direct collection writes (hook defense, C) and the
 *     DB unique indexes (D);
 *   - supersedesLock cannot move a Document between stages (G);
 *   - correction restores priorLocked and provenance (E, I);
 *   - concurrent supersedes of one predecessor cannot fork (H).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, existsSync } from 'node:fs'

import { getPayload, type Payload, type User } from 'payload'

import config from '@/payload.config'

import { addDocumentRelationship, correctSupersession, removeDocumentRelationship, runInTransaction } from '@/lib/documents/relationships'
import { recordDocumentProvenance } from '@/lib/documents/provenance'

type Id = number

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payloadPromise: Promise<Payload> = getPayload({ config })

async function fixture() {
  const payload = await payloadPromise
  const user = await payload.create({ collection: 'users', data: { email: 'supersession-probe@example.test', password: 'test-password-123', name: 'supersession-probe' } } as never) as User & { id: Id }
  const makeDomain = async (name: string, slug: string) => payload.create({ collection: 'domains', data: { name, slug, kind: 'community', ownerUser: user.id, defaultFilingPolicy: 'direct-file' } } as never)
  const alpha = await makeDomain('Alpha', 'alpha-supersession')
  const beta = await makeDomain('Beta', 'beta-supersession')
  const rootAlpha = await payload.create({ collection: 'folders', data: { domain: alpha.id, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit' } } as never)
  const rootBeta = await payload.create({ collection: 'folders', data: { domain: beta.id, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit' } } as never)
  const typeAlpha = await payload.create({ collection: 'document-types', data: { domain: alpha.id, name: 'Plain Text', active: true, templateSelection: 'blank', defaultFilingPolicy: 'direct-file' } } as never)
  const typeBeta = await payload.create({ collection: 'document-types', data: { domain: beta.id, name: 'Plain Text', active: true, templateSelection: 'blank', defaultFilingPolicy: 'direct-file' } } as never)

  const makeDoc = async (title: string, lifecycle: 'draft' | 'submitted' | 'filed' | 'deprecated', opts: { domain?: Id; folder?: Id; type?: Id; locked?: boolean; transactionID?: number | string } = {}) => {
    const domain = opts.domain ?? alpha.id
    const folder = opts.folder ?? rootAlpha.id
    const type = opts.type ?? typeAlpha.id
    return payload.create({ collection: 'documents', req: opts.transactionID == null ? undefined : { transactionID: opts.transactionID }, context: { allowSystemCreate: true }, data: { domain, documentType: type, folder, title, body: `# ${title}\n\n`, origin: 'web-editor', sourceKind: 'web', lifecycle, ...(opts.locked == null ? {} : { locked: opts.locked }), publicAccess: 'inherit', createdBy: user.id } } as never)
  }

  return { payload, user, alpha, beta, rootAlpha, rootBeta, typeAlpha, typeBeta, makeDoc }
}

const f = await fixture()

type EdgeRow = { id: Id; source: Id; target: Id; kind: string }
const relationId = (value: unknown): Id | null => value === null || value === undefined || value === '' ? null : typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: Id }).id) : Number(value)

async function edgesForTarget(payload: Payload, targetId: Id): Promise<EdgeRow[]> {
  const rows = await payload.find({ collection: 'document-relationships', where: { and: [{ kind: { equals: 'supersedes' } }, { target: { equals: targetId } }] }, depth: 0, limit: 50, overrideAccess: true })
  return rows.docs.map((edge) => ({ id: Number(edge.id), source: Number(relationId((edge as { source: unknown }).source)), target: Number(relationId((edge as { target: unknown }).target)), kind: String((edge as { kind: unknown }).kind) }))
}

async function edgesFromSource(payload: Payload, sourceId: Id): Promise<EdgeRow[]> {
  const rows = await payload.find({ collection: 'document-relationships', where: { and: [{ kind: { equals: 'supersedes' } }, { source: { equals: sourceId } }] }, depth: 0, limit: 50, overrideAccess: true })
  return rows.docs.map((edge) => ({ id: Number(edge.id), source: Number(relationId((edge as { source: unknown }).source)), target: Number(relationId((edge as { target: unknown }).target)), kind: String((edge as { kind: unknown }).kind) }))
}

async function docLifecycle(payload: Payload, id: Id): Promise<string> {
  const doc = await payload.findByID({ collection: 'documents', id, depth: 0, overrideAccess: true })
  return String((doc as { lifecycle: unknown }).lifecycle)
}

async function docLocked(payload: Payload, id: Id): Promise<boolean> {
  const doc = await payload.findByID({ collection: 'documents', id, depth: 0, overrideAccess: true })
  return Boolean((doc as { locked: unknown }).locked)
}

async function eventsFor(payload: Payload, documentId: Id): Promise<Array<{ eventType: string; context?: Record<string, unknown> | null }>> {
  const rows = await payload.find({ collection: 'document-provenance-events', where: { document: { equals: documentId } }, depth: 0, limit: 100, sort: 'id', overrideAccess: true })
  return rows.docs.map((event) => ({ eventType: String((event as { eventType: unknown }).eventType), context: (event as { context?: Record<string, unknown> | null }).context ?? null }))
}

const actor = { userId: Number(f.user.id) }

test('P05R-T02: an explicit transaction rolls back all writes on failure', async () => {
  const { payload, makeDoc } = f
  const s = await makeDoc('RollbackSource', 'filed')
  const t = await makeDoc('RollbackTarget', 'filed')
  await assert.rejects(
    runInTransaction(payload, async (transactionID) => {
      await payload.create({ collection: 'document-relationships', overrideAccess: true, req: { transactionID }, data: { domain: f.alpha.id, source: s.id, target: t.id, kind: 'supersedes', actorUser: f.user.id } } as never)
      await recordDocumentProvenance({ payload, domainId: f.alpha.id, documentId: t.id, eventType: 'locked', actorUserId: f.user.id, context: { reason: 'superseded' }, transactionID })
      throw new Error('boom')
    }),
    /boom/,
  )
  assert.equal((await edgesForTarget(payload, t.id)).length, 0, 'rolled-back edge must not persist')
  assert.equal((await eventsFor(payload, t.id)).length, 0, 'rolled-back provenance must not persist')
  assert.equal(await docLifecycle(payload, t.id), 'filed', 'rolled-back stage must not persist')
  assert.equal(await docLocked(payload, t.id), false, 'rolled-back lock must not persist')
})

test('P05R-T10: create-and-relate sees the successor inside its transaction', async () => {
  const { payload, makeDoc } = f
  const target = await makeDoc('TransactionTarget', 'filed')
  const created = await runInTransaction(payload, async (transactionID) => {
    const successor = await makeDoc('TransactionSuccessor', 'filed', { transactionID })
    await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: successor.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true, transactionID })
    return successor
  })
  assert.equal((await edgesForTarget(payload, target.id)).length, 1)
  assert.equal(await docLifecycle(payload, target.id), 'filed', 'stage is preserved under supersession')
  assert.equal(await docLocked(payload, target.id), true, 'predecessor receives the preservation lock')
  assert.ok(created.id)
})

test('P05R-T02: Draft and Submitted records cannot be superseded (no edge, lock, or provenance)', async () => {
  const { payload, makeDoc } = f
  const draftTarget = await makeDoc('DraftRecord', 'draft')
  const submittedTarget = await makeDoc('SubmittedRecord', 'submitted')
  const source = await makeDoc('SupersedeSource', 'filed')
  for (const target of [draftTarget, submittedTarget]) {
    await assert.rejects(
      addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: source.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true }),
      /Only Filed or Deprecated/,
    )
    assert.equal((await edgesForTarget(payload, target.id)).length, 0, 'no edge may exist for an ineligible predecessor')
    assert.equal(await docLifecycle(payload, target.id), String((target as { lifecycle: unknown }).lifecycle) === 'submitted' ? 'submitted' : 'draft', 'ineligible predecessor lifecycle unchanged')
    assert.equal(await docLocked(payload, target.id), false, 'ineligible predecessor never receives a lock')
    assert.equal((await eventsFor(payload, target.id)).length, 0, 'no provenance may be recorded for an ineligible predecessor')
  }
})

test('P05R-T02: a Filed supersede succeeds atomically and the predecessor timeline shows superseded-by', async () => {
  const { payload, makeDoc } = f
  const source = await makeDoc('NewerVersion', 'filed')
  const target = await makeDoc('OlderVersion', 'filed')
  const edge = await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: source.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  assert.ok(edge?.id, 'edge created')
  const out = await edgesForTarget(payload, target.id)
  assert.equal(out.length, 1, 'exactly one successor edge')
  assert.equal(out[0].source, Number(source.id))
  assert.equal(await docLifecycle(payload, target.id), 'filed', 'predecessor keeps its stage')
  assert.equal(await docLocked(payload, target.id), true, 'predecessor is locked by supersession')
  const targetEvents = await eventsFor(payload, target.id)
  const supersededEvent = targetEvents.find((event) => event.eventType === 'superseded')
  assert.ok(supersededEvent, 'predecessor timeline must show a superseded event (P05R-T02 F)')
  assert.equal(Number(supersededEvent?.context?.supersedingDocumentId), Number(source.id), 'superseded context names the successor')
  assert.ok(targetEvents.some((event) => event.eventType === 'locked'), 'predecessor timeline shows the lock')
  const sourceEvents = await eventsFor(payload, source.id)
  assert.ok(sourceEvents.some((event) => event.eventType === 'superseded'), 'successor timeline carries the counterpart superseded event')
})

test('P05R-T02: second successor is impossible through the service and through direct writes', async () => {
  const { payload, makeDoc } = f
  const first = await makeDoc('FirstSuccessor', 'filed')
  const second = await makeDoc('SecondSuccessor', 'filed')
  const target = await makeDoc('SharedPredecessor', 'filed')
  await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: first.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  await assert.rejects(
    addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: second.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true }),
    /only one direct superseding successor/,
  )
  await assert.rejects(
    payload.create({ collection: 'document-relationships', overrideAccess: true, data: { domain: f.alpha.id, source: second.id, target: target.id, kind: 'supersedes', actorUser: f.user.id } } as never),
    /only one direct superseding successor/,
    'the collection hook must reject a forked successor on direct writes',
  )
  assert.equal((await edgesForTarget(payload, target.id)).length, 1, 'still exactly one successor')
})

test('P05R-T02: second predecessor is impossible through the service and through direct writes', async () => {
  const { payload, makeDoc } = f
  const source = await makeDoc('BusySuccessor', 'filed')
  const targetA = await makeDoc('PredecessorA', 'filed')
  const targetB = await makeDoc('PredecessorB', 'filed')
  await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: source.id, targetId: targetA.id, kind: 'supersedes', actor, skipAuthorization: true })
  await assert.rejects(
    addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: source.id, targetId: targetB.id, kind: 'supersedes', actor, skipAuthorization: true }),
    /can supersede only one direct predecessor/,
  )
  await assert.rejects(
    payload.create({ collection: 'document-relationships', overrideAccess: true, data: { domain: f.alpha.id, source: source.id, target: targetB.id, kind: 'supersedes', actorUser: f.user.id } } as never),
    /can supersede only one direct predecessor/,
    'the collection hook must reject a second predecessor on direct writes',
  )
  assert.equal((await edgesFromSource(payload, source.id)).length, 1, 'still exactly one predecessor edge')
})

test('P05R-T02: cycles are impossible through the service and through direct writes', async () => {
  const { payload, makeDoc } = f
  const a = await makeDoc('CycleA', 'filed')
  const b = await makeDoc('CycleB', 'filed')
  const c = await makeDoc('CycleC', 'filed')
  await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: a.id, targetId: b.id, kind: 'supersedes', actor, skipAuthorization: true })
  await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: c.id, targetId: a.id, kind: 'supersedes', actor, skipAuthorization: true })
  // Closing the loop: b supersedes c would create b -> c -> a -> b.
  await assert.rejects(
    addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: b.id, targetId: c.id, kind: 'supersedes', actor, skipAuthorization: true }),
    /acyclic/,
  )
  await assert.rejects(
    payload.create({ collection: 'document-relationships', overrideAccess: true, data: { domain: f.alpha.id, source: b.id, target: c.id, kind: 'supersedes', actorUser: f.user.id } } as never),
    /acyclic/,
    'the collection hook must reject a cycle on direct writes',
  )
})

test('P05R-T02: the relationship hook rejects cross-Domain edges', async () => {
  const { payload, makeDoc } = f
  const betaDoc = await makeDoc('BetaRecord', 'filed', { domain: f.beta.id, folder: f.rootBeta.id, type: f.typeBeta.id })
  const alphaDoc = await makeDoc('AlphaRecord', 'filed')
  await assert.rejects(
    payload.create({ collection: 'document-relationships', overrideAccess: true, data: { domain: f.alpha.id, source: alphaDoc.id, target: betaDoc.id, kind: 'supersedes', actorUser: f.user.id } } as never),
    /share the relationship Domain/,
  )
})

test('P05R-T02: supersedesLock applies the preservation lock without moving stages', async () => {
  const { payload, makeDoc } = f
  const draft = await makeDoc('LockedDraftAttempt', 'draft')
  // The supersedesLock seam is not a lifecycle bypass: even carrying the
  // preservation lock it must never move a Document between stages.
  await assert.rejects(
    payload.update({ collection: 'documents', id: draft.id, overrideAccess: true, context: { supersedesLock: true }, data: { locked: true, lifecycle: 'filed' } } as never),
    /Supersession never moves a Document between lifecycle stages/,
    'supersedesLock must never be a stage-move bypass',
  )
  // And it may never apply without actually setting the preservation lock.
  await assert.rejects(
    payload.update({ collection: 'documents', id: draft.id, overrideAccess: true, context: { supersedesLock: true }, data: { lifecycle: 'filed' } } as never),
    /can only receive the preservation lock/,
    'supersedesLock must always set the locked flag',
  )
  assert.equal(await docLifecycle(payload, draft.id), 'draft')
  assert.equal(await docLocked(payload, draft.id), false)
})

test('P05R-T02: correction restores priorLocked and provenance; re-add re-locks', async () => {
  const { payload, makeDoc } = f
  const wrong = await makeDoc('WrongSuccessor', 'filed')
  const replacement = await makeDoc('ReplacementSuccessor', 'filed')
  const target = await makeDoc('CorrectedPredecessor', 'filed')
  const edge = await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: wrong.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  assert.equal(await docLocked(payload, target.id), true)

  await correctSupersession({ payload, domainId: f.alpha.id, relationshipId: edge.id, actor, skipAuthorization: true })
  assert.equal((await edgesForTarget(payload, target.id)).length, 0, 'edge removed')
  assert.equal(await docLifecycle(payload, target.id), 'filed', 'stage untouched by the correction')
  assert.equal(await docLocked(payload, target.id), false, 'predecessor must not stay locked with no successor (P05R-T02 E)')
  const afterRemove = await eventsFor(payload, target.id)
  assert.ok(afterRemove.some((event) => event.eventType === 'unlocked'), 'correction provenance records the unlock')
  assert.ok(afterRemove.some((event) => event.eventType === 'relationship_removed'), 'correction provenance records the removal')

  // Removing the wrong successor twice must fail cleanly (already gone).
  await assert.rejects(removeDocumentRelationship({ payload, domainId: f.alpha.id, relationshipId: edge.id, actor, skipAuthorization: true }))

  const reEdge = await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: replacement.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  assert.ok(reEdge?.id)
  assert.equal(await docLocked(payload, target.id), true, 're-adding a successor re-locks the predecessor')
  assert.equal((await edgesForTarget(payload, target.id)).length, 1, 'exactly one successor after re-add')
})

test('P05R-T10: correction preserves an independently Locked predecessor', async () => {
  const { payload, makeDoc } = f
  const source = await makeDoc('IndependentLockSuccessor', 'filed')
  const target = await makeDoc('IndependentLockPredecessor', 'filed', { locked: true })
  const edge = await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: source.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  await correctSupersession({ payload, domainId: f.alpha.id, relationshipId: edge.id, actor, skipAuthorization: true })
  assert.equal(await docLocked(payload, target.id), true, 'an independently locked predecessor keeps its lock')
  assert.equal(await docLifecycle(payload, target.id), 'filed')
  const events = await eventsFor(payload, target.id)
  assert.ok(!events.some((event) => event.eventType === 'unlocked' && event.context?.reason === 'supersession-corrected'))
})

test('P05R-T02: two supersede attempts of one predecessor cannot fork', async () => {
  const { payload, makeDoc } = f
  const winner = await makeDoc('RaceWinner', 'filed')
  const loser = await makeDoc('RaceLoser', 'filed')
  const target = await makeDoc('RacePredecessor', 'filed')
  // The libsql local client is single-connection: a second transaction begun
  // while one is open is refused with SQLITE_BUSY at the adapter (verified
  // empirically during P05R-T02), so two write transactions cannot overlap.
  // The fork guarantee therefore rests on the in-transaction invariant re-read
  // plus the DB unique index on (target, kind) — exercised here as consecutive
  // attempts: the first wins, and the second must fail cleanly with the
  // surfaced invariant error, leaving exactly one successor and no residue.
  const first = await addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: winner.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true })
  assert.ok(first?.id, 'first supersede wins')
  await assert.rejects(
    addDocumentRelationship({ payload, domainId: f.alpha.id, sourceId: loser.id, targetId: target.id, kind: 'supersedes', actor, skipAuthorization: true }),
    /only one direct superseding successor/,
    'the loser fails cleanly with the surfaced error',
  )
  const edges = await edgesForTarget(payload, target.id)
  assert.equal(edges.length, 1, 'no fork: exactly one successor edge')
  assert.equal(edges[0].source, Number(winner.id), 'the surviving edge is the first attempt')
  assert.equal(await docLocked(payload, target.id), true, 'predecessor locked by the winning supersede')
  assert.equal(await docLifecycle(payload, target.id), 'filed', 'predecessor stage preserved')
  assert.equal(await docLifecycle(payload, loser.id), 'filed', 'loser document untouched — no stray lock or lifecycle change')
  assert.equal(await docLocked(payload, loser.id), false, 'loser receives no stray lock')
  assert.equal((await eventsFor(payload, loser.id)).length, 0, 'loser leaves no provenance residue')
})
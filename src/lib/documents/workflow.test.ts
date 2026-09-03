import assert from 'node:assert/strict'
import test from 'node:test'

import { transitionDocument, type WorkflowOperation } from './workflow'
import { Documents } from '@/collections/Documents'

function fakePayload(initialLifecycle: string, failUpdate = false) {
  const updates: any[] = []
  const events: any[] = []
  const payload = {
    find: async () => ({ docs: [{ id: 12, lifecycle: initialLifecycle, title: 'Record' }] }),
    update: async (args: any) => { if (failUpdate) throw new Error('transaction failed'); updates.push(args); return { id: 12 } },
    findVersions: async () => ({ docs: [] }),
    create: async (args: any) => { events.push(args); return { id: events.length } },
  } as any
  return { payload, updates, events }
}

test('workflow transitions append the corresponding provenance event', async () => {
  const cases: Array<[WorkflowOperation, string, string]> = [
    ['submit', 'draft', 'submitted'],
    ['file', 'draft', 'filed'],
    ['approve', 'pending_review', 'approved'],
    ['reject', 'pending_review', 'rejected'],
    ['lock', 'filed', 'locked'],
    ['unlock', 'locked', 'unlocked'],
  ]
  for (const [operation, from, eventType] of cases) {
    const { payload, updates, events } = fakePayload(from)
    await transitionDocument({ payload, userId: 2, domainId: 4, documentId: 12, operation, note: operation === 'reject' ? 'Needs a seal' : null })
    assert.equal(updates[0].data.lifecycle, operation === 'submit' ? 'pending_review' : operation === 'file' || operation === 'approve' || operation === 'unlock' ? 'filed' : operation === 'reject' ? 'draft' : 'locked')
    assert.equal(events[0].data.eventType, eventType)
    if (operation === 'reject') assert.equal(events[0].data.context.note, 'Needs a seal')
  }
})

test('failed lifecycle mutation does not append a misleading event', async () => {
  const { payload, events } = fakePayload('filed', true)
  await assert.rejects(() => transitionDocument({ payload, userId: 2, domainId: 4, documentId: 12, operation: 'lock' }))
  assert.equal(events.length, 0)
})

test('direct lifecycle mutation requires interim supervisor authority', async () => {
  const beforeChange = Documents.hooks?.beforeChange?.[0] as any
  const payload = {
    findByID: async () => ({ id: 4, ownerUser: 10 }),
    find: async () => ({ docs: [] }),
  }
  await assert.rejects(() => beforeChange({
    data: { domain: 4, folder: 1, lifecycle: 'locked' },
    originalDoc: { domain: 4, folder: 1, lifecycle: 'filed' },
    operation: 'update',
    req: { payload, user: { id: 11 }, context: {} },
  }), /Owner or an operational Domain Admin/)
})

test('direct Document reads fail closed for guessed revision callers', async () => {
  const read = Documents.access?.read as any
  const payload = {
    find: async (args: any) => {
      if (args.collection === 'documents') return { docs: [{ id: 12, domain: 4, lifecycle: 'filed' }] }
      return { docs: [] }
    },
    findByID: async () => ({ id: 4, ownerUser: 10 }),
  }
  assert.equal(await read({ req: { user: { id: 11 }, payload }, id: 12 }), false)
  assert.equal(await read({ req: { user: { id: 10 }, payload }, id: 12 }), true)
})

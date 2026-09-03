import assert from 'node:assert/strict'
import test from 'node:test'

import { transitionDocument, type WorkflowOperation } from './workflow'

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

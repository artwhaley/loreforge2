import assert from 'node:assert/strict'
import test from 'node:test'

import { DocumentProvenanceEvents } from '@/collections/DocumentProvenanceEvents'
import { describeProvenanceEvent, provenanceTimelineSort, recordDocumentProvenance, type ProvenanceEventType } from './provenance'

test('provenance writer appends actor, context, and event type for lifecycle actions', async () => {
  const writes: any[] = []
  const payload = { create: async (args: any) => { writes.push(args); return { id: writes.length } } } as any
  const events: ProvenanceEventType[] = ['created', 'edited', 'filed', 'locked', 'unlocked']
  for (const eventType of events) {
    await recordDocumentProvenance({ payload, domainId: 4, documentId: 9, eventType, actorUserId: 2, actorCharacterId: 7, context: { before: 'draft', after: eventType } })
  }
  assert.equal(writes.length, events.length)
  assert.deepEqual(writes.map((write) => write.data.eventType), events)
  assert.equal(writes[0].overrideAccess, true)
  assert.equal(writes[0].data.actorUser, 2)
  assert.equal(writes[0].data.actorCharacter, 7)
  assert.equal(writes[0].data.context.after, 'created')
  assert.ok(writes.every((write) => typeof write.data.occurredAt === 'string'))
})

test('provenance collection is append-only to normal actors', () => {
  const access = DocumentProvenanceEvents.access
  assert.equal((access?.update as (args: unknown) => boolean)({}), false)
  assert.equal((access?.delete as (args: unknown) => boolean)({}), false)
  assert.equal((access?.create as (args: unknown) => boolean)({}), false)
})

test('timeline ordering and human summaries are deterministic', () => {
  assert.deepEqual(provenanceTimelineSort, ['occurredAt', 'id'])
  assert.equal(describeProvenanceEvent('rejected', { note: 'Needs a seal' }), 'returned the record to Draft: Needs a seal')
  assert.equal(describeProvenanceEvent('edited'), 'edited the record')
})

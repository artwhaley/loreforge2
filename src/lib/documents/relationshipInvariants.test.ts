import assert from 'node:assert/strict'
import test from 'node:test'

import { assertNoSupersedesCycle, assertRelationshipInput } from './relationshipInvariants'

test('only supersedes relationships are accepted and self-links are rejected', () => {
  assert.equal(assertRelationshipInput({ sourceId: 2, targetId: 1, kind: 'supersedes' }), true)
  assert.throws(() => assertRelationshipInput({ sourceId: 1, targetId: 2, kind: 'grouped' as never }), /Only supersedes/)
  assert.throws(() => assertRelationshipInput({ sourceId: 1, targetId: 1, kind: 'supersedes' }), /itself/)
})

test('supersedes cycles are rejected while chains remain valid', () => {
  const chain = new Map([['3', '2'], ['2', '1']])
  assert.equal(assertNoSupersedesCycle(4, 3, chain), true)
  assert.throws(() => assertNoSupersedesCycle(1, 3, chain), /acyclic/)
})

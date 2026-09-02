import test from 'node:test'
import assert from 'node:assert/strict'

import { canUserActAsCharacter, validateCharacterStatus } from './invariants'

test('only the controlling User can act as an active Character', () => {
  assert.equal(canUserActAsCharacter(7, { id: 1, controlledBy: 7, status: 'active' }), true)
  assert.equal(canUserActAsCharacter(8, { id: 1, controlledBy: 7, status: 'active' }), false)
  assert.equal(canUserActAsCharacter(7, { id: 1, controlledBy: null, status: 'active' }), false)
  assert.equal(canUserActAsCharacter(7, { id: 1, controlledBy: 7, status: 'inactive' }), false)
})

test('merged Character state is explicit and cannot be self-referential', () => {
  assert.equal(validateCharacterStatus({ id: 1, status: 'merged', mergedInto: 2 }), true)
  assert.match(String(validateCharacterStatus({ id: 1, status: 'merged' })), /surviving/)
  assert.match(String(validateCharacterStatus({ id: 1, status: 'active', mergedInto: 2 })), /Only merged/)
  assert.match(String(validateCharacterStatus({ id: 1, status: 'merged', mergedInto: 1 })), /itself/)
})

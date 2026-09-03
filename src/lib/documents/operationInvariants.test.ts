import assert from 'node:assert/strict'
import test from 'node:test'

import { copyLifecycle, operationIdentity, resolveCrossDomainType } from './operationInvariants'

test('copy starts Draft and changes identity while Move preserves it', () => {
  assert.equal(copyLifecycle('community'), 'draft')
  assert.deepEqual(operationIdentity('copy', 1, 9), { idChanges: true, expectedId: 9 })
  assert.deepEqual(operationIdentity('cross-domain-move', 1, 9), { idChanges: false, expectedId: 1 })
})

test('cross-Domain Type mapping uses case-insensitive exact name then Plain Text', () => {
  assert.equal(resolveCrossDomainType('Incident Report', [{ id: 4, name: 'incident report' }], 1), 4)
  assert.equal(resolveCrossDomainType('Missing', [{ id: 4, name: 'incident report' }], 1), 1)
  assert.equal(resolveCrossDomainType('Missing', [], null), null)
})

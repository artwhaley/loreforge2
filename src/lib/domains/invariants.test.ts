import assert from 'node:assert/strict'
import test from 'node:test'

import { assertDomainOwnership } from './invariants'

test('Community Domain requires exactly one User owner', () => {
  assert.equal(assertDomainOwnership({ kind: 'community', ownerUser: 1 }), true)
  assert.throws(() => assertDomainOwnership({ kind: 'community' }), /exactly one Owner User/)
  assert.throws(() => assertDomainOwnership({ kind: 'community', ownerUser: 1, ownerCharacter: 2 }), /cannot have an Owner Character/)
})

test('Personal Domain ownership is Character-level and exclusive', () => {
  assert.equal(assertDomainOwnership({ kind: 'personal', ownerCharacter: 2 }), true)
  assert.throws(() => assertDomainOwnership({ kind: 'personal' }), /exactly one Owner Character/)
  assert.throws(() => assertDomainOwnership({ kind: 'personal', ownerCharacter: 2, ownerUser: 1 }), /cannot have an Owner User/)
})

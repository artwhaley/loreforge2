import assert from 'node:assert/strict'
import test from 'node:test'

import { assertCharacterLinkInput, normalizeTagName } from './linkInvariants'

test('prepared_by and concerns links have distinct label semantics', () => {
  assert.equal(assertCharacterLinkInput({ kind: 'prepared_by' }), true)
  assert.equal(assertCharacterLinkInput({ kind: 'concerns', relationshipLabel: 'owner' }), true)
  assert.throws(() => assertCharacterLinkInput({ kind: 'prepared_by', relationshipLabel: 'owner' }), /cannot have/)
  assert.throws(() => assertCharacterLinkInput({ kind: 'other' }), /invalid/)
})

test('Domain tags normalize lookup without changing display casing', () => {
  assert.equal(normalizeTagName('  Deed  '), 'deed')
  assert.throws(() => normalizeTagName('   '), /blank/)
})

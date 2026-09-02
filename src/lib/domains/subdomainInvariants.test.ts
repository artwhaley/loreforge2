import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSubdomainShape } from './subdomainInvariants'

test('Subdomain belongs to one Domain and is not recursive', () => {
  assert.equal(assertSubdomainShape({ domainId: 1, slug: 'warriors' }), true)
  assert.throws(() => assertSubdomainShape({ domainId: 1, slug: 'nested', parentSubdomainId: 2 }), /recursive/)
  assert.throws(() => assertSubdomainShape({ domainId: 1, slug: '' }), /slug is required/)
})

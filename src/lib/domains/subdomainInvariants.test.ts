import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSubdomainShape, slugifyDepartmentName } from './subdomainInvariants'

test('Subdomain belongs to one Domain and is not recursive', () => {
  assert.equal(assertSubdomainShape({ domainId: 1, slug: 'warriors' }), true)
  assert.throws(() => assertSubdomainShape({ domainId: 1, slug: 'nested', parentSubdomainId: 2 }), /recursive/)
  assert.throws(() => assertSubdomainShape({ domainId: 1, slug: '' }), /slug is required/)
})

test('slugifyDepartmentName derives a clean URL slug from the display name', () => {
  assert.equal(slugifyDepartmentName('Hall of Coin'), 'hall-of-coin')
  assert.equal(slugifyDepartmentName("  Clerk's Office  "), 'clerk-s-office')
  assert.equal(slugifyDepartmentName('Townsfolk'), 'townsfolk')
  assert.equal(slugifyDepartmentName('Hôtel Ar'), 'hotel-ar')
  assert.equal(slugifyDepartmentName('!!!'), '')
  assert.equal(slugifyDepartmentName(''), '')
})

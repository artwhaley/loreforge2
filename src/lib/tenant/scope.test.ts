import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { tenantAndIdWhere, tenantWhere } from './scope.js'

test('tenantWhere scopes to a single tenant', () => {
  assert.deepEqual(tenantWhere(7), { and: [{ tenant: { equals: 7 } }] })
})

test('tenantWhere merges an extra condition', () => {
  assert.deepEqual(tenantWhere('ravenhurst', { title: { like: 'report' } }), {
    and: [{ tenant: { equals: 'ravenhurst' } }, { title: { like: 'report' } }],
  })
})

test('tenantAndIdWhere scopes to tenant AND id', () => {
  assert.deepEqual(tenantAndIdWhere(3, 99), {
    and: [{ tenant: { equals: 3 } }, { id: { equals: 99 } }],
  })
})

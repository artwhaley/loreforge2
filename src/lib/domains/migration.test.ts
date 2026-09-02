import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDomainMigrationPlan, hashBodies } from './migration'

test('maps every legacy Tenant by stable slug and reconciles body hashes', () => {
  const plan = buildDomainMigrationPlan(
    [{ id: 1, slug: 'ravenhurst', name: 'City of Ravenhurst' }, { id: 2, slug: 'port-victoria', name: 'Port Victoria' }],
    [{ id: 10, slug: 'ravenhurst', name: 'City of Ravenhurst' }, { id: 11, slug: 'port-victoria', name: 'Port Victoria' }],
    hashBodies(['a', 'b']),
  )
  assert.deepEqual(plan.mappings, [{ legacyTenantId: 1, domainId: 10, slug: 'ravenhurst' }, { legacyTenantId: 2, domainId: 11, slug: 'port-victoria' }])
  assert.equal(plan.reconciliation.legacyCount, plan.reconciliation.domainCount)
  assert.deepEqual(plan.reconciliation.legacyBodyHashes, plan.reconciliation.domainBodyHashes)
})

test('fails closed when a legacy Tenant has no Domain mapping', () => {
  assert.throws(() => buildDomainMigrationPlan([{ id: 1, slug: 'missing', name: 'Missing' }], []), /No Domain mapping/)
})

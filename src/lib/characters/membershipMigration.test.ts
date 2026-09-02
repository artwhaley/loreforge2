import test from 'node:test'
import assert from 'node:assert/strict'

import { planMembershipMigration } from './membershipMigration'

test('maps a single controlled Character without fan-out', () => {
  const result = planMembershipMigration(
    [{ id: 1, userId: 10, tenantId: 20, role: 'member' }],
    new Map([['10', [101]]]),
  )
  assert.deepEqual(result.mapped.map((row) => row.characterId), [101])
  assert.deepEqual(result.unresolved, [])
  assert.deepEqual(result.accountedRowIds, ['1'])
})

test('leaves ambiguous multi-Character Users unresolved instead of fanning out', () => {
  const result = planMembershipMigration(
    [{ id: 2, userId: 10, tenantId: 20, role: 'admin' }],
    new Map([['10', [101, 102]]]),
  )
  assert.equal(result.mapped.length, 0)
  assert.match(result.unresolved[0]?.reason ?? '', /multiple active Characters/)
})

test('explicit fixture mapping resolves an otherwise ambiguous row and rejects foreign Characters', () => {
  const result = planMembershipMigration(
    [
      { id: 3, userId: 10, tenantId: 20, role: 'admin' },
      { id: 4, userId: 10, tenantId: 21, role: 'member' },
    ],
    new Map([['10', [101, 102]]]),
    [
      { userId: 10, tenantId: 20, characterId: 102, reason: 'Fixture owner selection.' },
      { userId: 10, tenantId: 21, characterId: 999, reason: 'Invalid foreign mapping.' },
    ],
  )
  assert.equal(result.mapped[0]?.characterId, 102)
  assert.match(result.unresolved[0]?.reason ?? '', /does not belong/)
  assert.deepEqual(result.accountedRowIds.sort(), ['3', '4'])
})

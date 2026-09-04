import test from 'node:test'
import assert from 'node:assert/strict'

import { isRoleDescendant, roleMatchesHeldRole } from './roleTree'

const roles = [
  { id: 1, domainId: 1, departmentId: 10, parentId: null, active: true },
  { id: 2, domainId: 1, departmentId: 10, parentId: 1, active: true },
  { id: 3, domainId: 1, departmentId: 10, parentId: 2, active: true },
  { id: 4, domainId: 1, departmentId: 20, parentId: null, active: true },
]

test('P07-T01 role ancestry is strict and Department-bound by callers', () => {
  assert.equal(isRoleDescendant(3, 1, roles), true)
  assert.equal(isRoleDescendant(1, 1, roles), false)
  assert.equal(isRoleDescendant(4, 1, roles), false)
  assert.equal(roleMatchesHeldRole(3, [1], roles), true)
})


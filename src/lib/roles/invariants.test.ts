import assert from 'node:assert/strict'
import test from 'node:test'

import { assertMultiRoleAssignment, assertRoleAssignment, assertRoleHierarchy } from './invariants'

const role = (id: number, domainId = 3, subdomainId: number | null = 7, parentRoleId: number | null = null) => ({ id, domainId, subdomainId, parentRoleId })

test('rejects role parent cycles and cross-Domain parents', () => {
  assert.throws(() => assertRoleHierarchy(role(2, 3, 7, 1), role(1, 3, 7, 2), [role(1, 3, 7, 2), role(2, 3, 7, 1)]), /acyclic/)
  assert.throws(() => assertRoleHierarchy(role(2, 3, 7, 1), role(1, 4, 8), [role(1, 4, 8)]), /same Domain/)
})

test('Role assignment has no Folder scope and requires a Department-owned Role', () => {
  assert.equal(assertRoleAssignment({ characterId: 10, roleId: 2 }, role(2, 3, 2)), true)
  assert.throws(() => assertRoleAssignment({ characterId: 10, roleId: 2 }, role(2, 3, null)), /Department-owned/)
})

test('allows a Character to hold distinct Roles', () => {
  assert.equal(assertMultiRoleAssignment([{ characterId: 10, roleId: 2 }, { characterId: 10, roleId: 8 }]), true)
})

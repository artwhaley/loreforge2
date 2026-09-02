import assert from 'node:assert/strict'
import test from 'node:test'

import { assertMultiRoleAssignment, assertRoleAssignment, assertRoleHierarchy } from './invariants'

const role = (id: number, domainId = 3, subdomainId: number | null = null, parentRoleId: number | null = null) => ({ id, domainId, subdomainId, parentRoleId })

test('rejects role parent cycles and cross-Domain parents', () => {
  assert.throws(() => assertRoleHierarchy(role(2, 3, null, 1), role(1, 3, null, 2), [role(1, 3, null, 2), role(2, 3, null, 1)]), /acyclic/)
  assert.throws(() => assertRoleHierarchy(role(2), role(1, 4), [role(1, 4)]), /same Domain/)
})

test('accepts a scoped folder only in the Role branch', () => {
  assert.equal(assertRoleAssignment({ characterId: 10, roleId: 2, scopeFolderId: 23 }, role(2, 3, 2), { id: 23, domainId: 3, subdomainId: 2 }), true)
  assert.throws(() => assertRoleAssignment({ characterId: 10, roleId: 2, scopeFolderId: 9 }, role(2, 3, 2), { id: 9, domainId: 3, subdomainId: 1 }), /Subdomain branch/)
})

test('allows a Character to hold distinct Roles', () => {
  assert.equal(assertMultiRoleAssignment([{ characterId: 10, roleId: 2 }, { characterId: 10, roleId: 8 }]), true)
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { computeAssignableRoleIds, departmentsForCharacter } from './participation'

// Role fixtures: three Roles across two Departments (dept 10, dept 20).
// Role 3 is a same-Department child of Role 1; Role 2 lives in dept 20.
const ROLES = [
  { id: 1, departmentId: 10, parentRoleId: null },
  { id: 3, departmentId: 10, parentRoleId: 1 },
  { id: 2, departmentId: 20, parentRoleId: null },
]

const assignment = (roleId: number, active = true) => ({ characterId: 99, roleId, active })

test('P05R-T03 E: Department participation follows active RoleAssignments exactly', () => {
  // 1. No Role in the Department -> no participation at all.
  assert.equal(departmentsForCharacter(99, [], ROLES).size, 0)

  // 2. First Department RoleAssignment -> participation appears.
  let participation = departmentsForCharacter(99, [assignment(1)], ROLES)
  assert.deepEqual([...participation.keys()], [10])
  assert.deepEqual(participation.get(10), [1])

  // 3. A second Role in the same Department keeps participation (both held).
  participation = departmentsForCharacter(99, [assignment(1), assignment(3)], ROLES)
  assert.deepEqual([...participation.keys()], [10])
  assert.deepEqual(participation.get(10), [1, 3])

  // 4. Removing one Role keeps participation (the other still grants it).
  participation = departmentsForCharacter(99, [assignment(3)], ROLES)
  assert.deepEqual([...participation.keys()], [10])
  assert.deepEqual(participation.get(10), [3])

  // 5. Removing the last Role makes participation disappear.
  participation = departmentsForCharacter(99, [], ROLES)
  assert.equal(participation.size, 0)

  // Inactive rows never grant participation (soft removal path).
  assert.equal(departmentsForCharacter(99, [assignment(1, false)], ROLES).size, 0)
})

test('P05R-T03 E: participation only for the queried Character and only for Roles with a Department', () => {
  const participation = departmentsForCharacter(98, [assignment(1)], ROLES)
  assert.equal(participation.size, 0, 'another Character\u2019s assignments never count')

  const orphaned = departmentsForCharacter(99, [{ characterId: 99, roleId: 999, active: true }], ROLES)
  assert.equal(orphaned.size, 0, 'a Role without a Department row cannot create participation')

  // No SubdomainMembership or legacy row is consulted: the function signature
  // only accepts assignments + roles, so legacy authority is structurally
  // impossible here.
  const inOtherDept = departmentsForCharacter(99, [assignment(2)], ROLES)
  assert.deepEqual([...inOtherDept.keys()], [20])
})

test('P05R-T03 B: assignable Role set — owner/admin sees all; otherwise same-Department and descendant Roles', () => {
  const all = computeAssignableRoleIds({ viewerIsAdmin: true, roles: ROLES, actorHeldRoleIds: [] })
  assert.deepEqual([...all].sort(), [1, 2, 3])

  // Actor holds Role 1 in dept 10 -> dept-10 Roles (1 and its child 3) are
  // assignable; the dept-20 Role is not.
  const restricted = computeAssignableRoleIds({ viewerIsAdmin: false, roles: ROLES, actorHeldRoleIds: [1] })
  assert.deepEqual([...restricted].sort(), [1, 3])

  // Actor holds only the child Role 3 -> parent (1) is NOT assignable (no
  // upward authority), but sibling children of held ancestors are not either.
  const childOnly = computeAssignableRoleIds({ viewerIsAdmin: false, roles: ROLES, actorHeldRoleIds: [3] })
  assert.deepEqual([...childOnly].sort(), [3])

  // Actor holds Role 2 (dept 20) -> dept-20 Roles assignable; dept 10 not.
  const dept20 = computeAssignableRoleIds({ viewerIsAdmin: false, roles: ROLES, actorHeldRoleIds: [2] })
  assert.deepEqual([...dept20].sort(), [2])
})

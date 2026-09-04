import test from 'node:test'
import assert from 'node:assert/strict'

import { filterRoleTree, roleMatchesMode, ROLE_MODE_LABELS, ROLE_MODES } from './roleFilters'

test('P05R-T03 B: the user-visible filter labels are exactly "Held roles" and "Roles I can assign"', () => {
  assert.deepEqual(ROLE_MODES, ['held', 'assignable'])
  assert.equal(ROLE_MODE_LABELS.held, 'Held roles')
  assert.equal(ROLE_MODE_LABELS.assignable, 'Roles I can assign')
  assert.equal(Object.keys(ROLE_MODE_LABELS).length, 2, 'no third filter mode')
})

test('P05R-T03 B: Held roles shows only roles the Character holds; Roles I can assign uses the assignable flag', () => {
  assert.equal(roleMatchesMode({ held: true }, 'held'), true)
  assert.equal(roleMatchesMode({ held: false }, 'held'), false)
  assert.equal(roleMatchesMode({ held: false, assignable: true }, 'assignable'), true)
  assert.equal(roleMatchesMode({ held: true, assignable: false }, 'assignable'), false)
  // Pre-P07 default: callers without assignability data treat every Role as assignable.
  assert.equal(roleMatchesMode({ held: false }, 'assignable'), true)
})

test('P05R-T03 B: filtering keeps branches that match or contain matches and prunes the rest', () => {
  const tree = {
    id: 1, name: 'Clerk', held: true, assignable: true, children: [
      { id: 3, name: 'Senior Clerk', held: false, assignable: false, children: [] },
      { id: 4, name: 'Junior Clerk', held: false, assignable: true, children: [] },
    ],
  }
  const heldTree = filterRoleTree(tree, (node) => roleMatchesMode(node, 'held'))!
  assert.equal(heldTree.id, 1)
  assert.equal(heldTree.children.length, 0, 'Held mode prunes non-held descendants')

  const assignableTree = filterRoleTree(tree, (node) => roleMatchesMode(node, 'assignable'))!
  assert.equal(assignableTree.children.length, 1)
  assert.equal(assignableTree.children[0].id, 4, 'assignable mode keeps only assignable descendants')
})

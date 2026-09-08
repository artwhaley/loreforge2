import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { FolderTreeNode, PermissionState, RoleTreeNode } from '@/components/people/PersonAccessTrees'
import { applyFolderStates, canCreateRootRole, flattenRoleNodes, roleMenuActions } from './roleManagement'

const roleNode = (id: number, name: string, children: RoleTreeNode[] = []): RoleTreeNode => ({ id, name, held: false, children })

const folderNode = (id: number, name: string, children: FolderTreeNode[] = []): FolderTreeNode => ({
  id, name, systemManaged: false, readState: 'inherit', writeState: 'inherit', children,
})

describe('OBSIDIAN-T04 role tree helpers', () => {
  it('flattens the Department role trees', () => {
    const tree = roleNode(1, 'Root', [roleNode(2, 'Sub', [roleNode(3, 'Leaf')])])
    assert.deepEqual(flattenRoleNodes([tree]).map((node) => node.id), [1, 2, 3])
  })

  it('overlays folder access states without mutating the source tree', () => {
    const tree = [folderNode(1, 'A', [folderNode(11, 'A1')])]
    const states: Record<string, { readState: PermissionState; writeState: PermissionState }> = { '11': { readState: 'grant', writeState: 'deny' } }
    const decorated = applyFolderStates(tree, states)
    assert.equal(decorated[0].readState, 'inherit')
    assert.equal(decorated[0].children[0].readState, 'grant')
    assert.equal(decorated[0].children[0].writeState, 'deny')
    // Source untouched.
    assert.equal(tree[0].children[0].readState, 'inherit')
  })
})

describe('OBSIDIAN-T04 role menu capability shape', () => {
  const base = { departmentId: 1, roleId: 10, manageableDepartmentIds: [1], assignableRoleIds: [10] }

  it('enables create/assign/delete with full capability', () => {
    assert.deepEqual(roleMenuActions(base), [
      { kind: 'create', disabled: false },
      { kind: 'assign', disabled: false },
      { kind: 'delete', disabled: false },
    ])
  })

  it('a role absent from assignableRoleIds never exposes an assignment control', () => {
    const actions = roleMenuActions({ ...base, assignableRoleIds: [] })
    assert.equal(actions.find((action) => action.kind === 'assign')?.disabled, true)
  })

  it('a Department absent from manageableDepartmentIds disables create and delete', () => {
    const actions = roleMenuActions({ ...base, manageableDepartmentIds: [2] })
    assert.equal(actions.find((action) => action.kind === 'create')?.disabled, true)
    assert.equal(actions.find((action) => action.kind === 'delete')?.disabled, true)
  })

  it('canCreateRootRole requires at least one manageable Department', () => {
    assert.equal(canCreateRootRole({ manageableDepartmentIds: [1] }), true)
    assert.equal(canCreateRootRole({ manageableDepartmentIds: [] }), false)
  })
})
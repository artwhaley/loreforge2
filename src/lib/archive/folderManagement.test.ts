import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { FolderManagementNode } from '@/lib/page-models/management/folders'
import {
  findFolderNode,
  flattenFolderNodes,
  folderContains,
  folderMenuActions,
  legalMoveTargets,
  manageableFolderIds,
  sortFolderNodes,
} from './folderManagement'

const node = (id: number, name: string, extra: Partial<FolderManagementNode> = {}): FolderManagementNode => ({
  id, name, createdAt: '2026-01-01T00:00:00Z', systemManaged: false, canManage: true, children: [], ...extra,
})

const TREE: FolderManagementNode[] = [
  node(1, 'Alpha', { createdAt: '2026-01-01T00:00:00Z', children: [node(11, 'Alpha 1', { createdAt: '2026-02-01T00:00:00Z' })] }),
  node(2, 'Beta', { createdAt: '2026-03-01T00:00:00Z', systemManaged: true }),
]

describe('OBSIDIAN-T03 folder sort', () => {
  it('sorts by name both directions, recursively', () => {
    assert.deepEqual(sortFolderNodes(TREE, 'name-asc').map((n) => n.name), ['Alpha', 'Beta'])
    assert.equal(sortFolderNodes(TREE, 'name-asc')[0].children[0].name, 'Alpha 1')
    assert.deepEqual(sortFolderNodes(TREE, 'name-desc').map((n) => n.name), ['Beta', 'Alpha'])
  })

  it('sorts by creation date both directions', () => {
    assert.equal(sortFolderNodes(TREE, 'date-asc')[0].name, 'Alpha')
    assert.equal(sortFolderNodes(TREE, 'date-asc')[1].name, 'Beta')
    assert.equal(sortFolderNodes(TREE, 'date-desc')[0].name, 'Beta')
    assert.equal(sortFolderNodes(TREE, 'date-desc')[1].name, 'Alpha')
  })
})

describe('OBSIDIAN-T03 tree helpers', () => {
  it('flattens with depths', () => {
    assert.deepEqual(flattenFolderNodes(TREE).map(({ depth }) => depth), [0, 1, 0])
  })

  it('folderContains detects self and descendants but not siblings', () => {
    assert.equal(folderContains(TREE[0], 1), true)
    assert.equal(folderContains(TREE[0], 11), true)
    assert.equal(folderContains(TREE[0], 2), false)
  })

  it('findFolderNode walks the tree', () => {
    assert.equal(findFolderNode(TREE, 11)?.name, 'Alpha 1')
    assert.equal(findFolderNode(TREE, 99), null)
  })
})

describe('OBSIDIAN-T03 legal move targets', () => {
  it('excludes the target itself and its descendants', () => {
    const targets = legalMoveTargets(TREE, 1, true)
    assert.ok(!targets.some(({ node: n }) => n.id === 1))
    assert.ok(!targets.some(({ node: n }) => n.id === 11))
    assert.ok(targets.some(({ node: n }) => n.id === 2))
  })

  it('excludes nodes the actor cannot manage', () => {
    const tree = [node(1, 'A', { canManage: false }), node(2, 'B')]
    assert.deepEqual(legalMoveTargets(tree, 2, false).map(({ node: n }) => n.id), [])
  })

  it('legal targets are folder nodes only; the Domain-root option is a separate gated affordance', () => {
    const targets = legalMoveTargets(TREE, 2, true)
    assert.deepEqual(targets.map(({ node: n }) => n.id), [1, 11])
  })
})

describe('OBSIDIAN-T03 manageable ids', () => {
  it('includes manageable nodes plus root when rootManageable', () => {
    const tree = [node(1, 'A', { canManage: false }), node(2, 'B')]
    assert.deepEqual(manageableFolderIds(tree, true), [2, 0])
    assert.deepEqual(manageableFolderIds(tree, false), [2])
  })
})

describe('OBSIDIAN-T03 denied menu actions', () => {
  it('offers create always; rename/move/delete only for non-system-managed', () => {
    assert.deepEqual(folderMenuActions(node(1, 'A')), [
      { kind: 'create', disabled: false },
      { kind: 'rename', disabled: false },
      { kind: 'move', disabled: false },
      { kind: 'delete', disabled: false },
    ])
    assert.deepEqual(folderMenuActions(node(1, 'A', { systemManaged: true })), [{ kind: 'create', disabled: false }])
  })

  it('disables every offered action when the actor cannot manage the node', () => {
    assert.deepEqual(folderMenuActions(node(1, 'A', { canManage: false })), [
      { kind: 'create', disabled: true },
      { kind: 'rename', disabled: true },
      { kind: 'move', disabled: true },
      { kind: 'delete', disabled: true },
    ])
  })
})
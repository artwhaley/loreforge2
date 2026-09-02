import assert from 'node:assert/strict'
import test from 'node:test'

import type { Folder } from '@/payload-types'

import { buildFolderTree, flattenFolderTree, folderPath } from './folderTree'

function f(id: number, name: string, parent: number | null): Folder {
  return { id, name, parent, tenant: 1, sortOrder: 0, createdAt: '', updatedAt: '' } as unknown as Folder
}

test('buildFolderTree nests children under their parent', () => {
  const folders = [f(1, 'City Records', null), f(2, 'Police', 1), f(3, 'Reports', 2), f(4, 'Ordinances', 1)]
  const tree = buildFolderTree(folders as Folder[])

  assert.equal(tree.length, 1)
  assert.equal(tree[0]!.folder.name, 'City Records')
  assert.equal(tree[0]!.children.length, 2)
  const police = tree[0]!.children.find((c) => c.folder.name === 'Police')
  assert.equal(police!.children[0]!.folder.name, 'Reports')
})

test('folderPath returns ancestors root-first excluding the folder itself', () => {
  const folders = [f(1, 'City Records', null), f(2, 'Police', 1), f(3, 'Reports', 2)]
  const path = folderPath(folders as Folder[], 3).map((x) => x.name)
  assert.deepEqual(path, ['City Records', 'Police'])
})

test('folderPath of a root folder is empty', () => {
  const folders = [f(1, 'City Records', null), f(2, 'Police', 1)]
  assert.deepEqual(folderPath(folders as Folder[], 1).map((x) => x.name), [])
})

test('flattenFolderTree yields depth-indented order', () => {
  const folders = [f(1, 'City Records', null), f(2, 'Police', 1), f(3, 'Reports', 2), f(4, 'Ordinances', 1)]
  const flat = flattenFolderTree(buildFolderTree(folders as Folder[]))
  assert.deepEqual(
    flat.map((x) => x.folder.name),
    ['City Records', 'Police', 'Reports', 'Ordinances'],
  )
  assert.deepEqual(
    flat.map((x) => x.depth),
    [0, 1, 2, 1],
  )
})

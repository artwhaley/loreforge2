import assert from 'node:assert/strict'
import test from 'node:test'

import { assertFolderPlacement } from './folderInvariants'

const f = (id: number, domainId: number, parentId: number | null = null) => ({ id, domainId, parentId })

test('rejects cross-Domain folder parents and cycles', () => {
  assert.equal(assertFolderPlacement(f(3, 1), f(2, 1), [f(2, 1)]), true)
  assert.throws(() => assertFolderPlacement(f(3, 1), f(2, 2), [f(2, 2)]), /same Domain/)
  assert.throws(() => assertFolderPlacement(f(2, 1, 3), f(3, 1, 2), [f(2, 1, 3), f(3, 1, 2)]), /cycles|cycle/)
})

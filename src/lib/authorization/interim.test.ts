import assert from 'node:assert/strict'
import test from 'node:test'

import { authorizeInterimOperation } from './interim'

const payload = {
  findByID: async () => ({ id: 4, ownerUser: 10 }),
  find: async () => ({ docs: [] }),
} as never

test('interim authority permits the owner and rejects ordinary users', async () => {
  assert.equal(await authorizeInterimOperation(payload, { userId: 10 }, 4), true)
  assert.match(String(await authorizeInterimOperation(payload, { userId: 11 }, 4)), /Owner or an operational/)
})

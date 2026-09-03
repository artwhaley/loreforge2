import assert from 'node:assert/strict'
import test from 'node:test'

import { authorizeSharedDocumentAccess } from './sharing'

test('temporary share adapter distinguishes direct grant from no share', async () => {
  const payload = {
    findByID: async () => ({ id: 4, domain: 3 }),
    find: async ({ where }: { where: { and: Array<Record<string, unknown>> } }) => {
      const principalType = where.and.find((item) => 'principalType' in item)?.principalType as { equals?: string } | undefined
      return principalType?.equals === 'User' ? { docs: [{ effect: 'grant' }] } : { docs: [] }
    },
  } as never
  assert.equal(await authorizeSharedDocumentAccess({ payload, documentId: 4, userId: 8, capability: 'read' }), true)
})

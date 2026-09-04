import assert from 'node:assert/strict'
import test from 'node:test'
import { assertRoleDefaultScope } from './roleDefaults'

test('P07-T03 Role defaults require a same-Domain Role and Folder', async () => {
  const payload = { findByID: async ({ collection }: { collection: string }) => collection === 'roles' ? { id: 4, domain: 1 } : { id: 9, domain: 1 } } as never
  assert.equal(await assertRoleDefaultScope(payload, { domainId: 1, roleId: 4, folderId: 9 }), true)
  await assert.rejects(() => assertRoleDefaultScope({ findByID: async ({ collection }: { collection: string }) => collection === 'roles' ? { id: 4, domain: 2 } : { id: 9, domain: 1 } } as never, { domainId: 1, roleId: 4, folderId: 9 }))
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { getParticipatingDepartmentIds } from './roles'

test('P07-T03 participation is derived from held Roles, not a membership row', async () => {
  const payload = {
    find: async ({ collection }: { collection: string }) => collection === 'roles'
      ? { docs: [{ id: 1, domain: 7, subdomain: 10, parentRole: null, active: true }, { id: 2, domain: 7, subdomain: 11, parentRole: null, active: true }] }
      : { docs: [{ id: 9, role: 1, character: 4, status: 'active' }] },
  } as never
  assert.deepEqual(await getParticipatingDepartmentIds(payload, { domainId: 7, characterId: 4 }), [10])
})

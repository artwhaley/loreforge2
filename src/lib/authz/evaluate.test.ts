import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluatePermission } from './evaluate'

function payloadMock() {
  const rules = [
    { id: 1, domain: 1, principalType: 'Character', principal: { relationTo: 'characters', value: 7 }, resourceType: 'Domain', resource: { relationTo: 'domains', value: 1 }, capability: 'read', effect: 'deny', active: true },
    { id: 2, domain: 1, principalType: 'Character', principal: { relationTo: 'characters', value: 7 }, resourceType: 'Folder', resource: { relationTo: 'folders', value: 12 }, capability: 'read', effect: 'grant', active: true },
  ]
  return {
    findByID: async ({ collection, id }: { collection: string; id: number | string }) => {
      if (collection === 'users') return { id: 5, isPlatformAdmin: false }
      if (collection === 'domains') return { id: 1, kind: 'community', ownerUser: 99 }
      if (collection === 'characters') return { id: 7, status: 'active' }
      if (collection === 'folders') return { id, domain: 1, parent: null, subdomain: null }
      return { id, domain: 1 }
    },
    find: async ({ collection }: { collection: string }) => {
      if (collection === 'domain-admins') return { docs: [] }
      if (collection === 'domain-memberships') return { docs: [{ id: 44 }] }
      if (collection === 'roles') return { docs: [] }
      if (collection === 'role-assignments') return { docs: [] }
      if (collection === 'permission-rules') return { docs: rules }
      return { docs: [] }
    },
  } as never
}

test('P07-T01 more-specific direct Character grant overrides broader deny', async () => {
  const decision = await evaluatePermission({ payload: payloadMock(), actor: { userId: 5, activeCharacterId: 7 }, domainId: 1, capability: 'read', resource: { type: 'Folder', id: 12 } })
  assert.equal(decision.allowed, true)
  assert.equal(decision.matchedRule?.id, 2)
})


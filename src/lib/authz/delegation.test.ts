import assert from 'node:assert/strict'
import test from 'node:test'
import { canAssignRole } from './delegation'

test('P07-T05 assign_subordinates is limited to strict descendants of a held Role', async () => {
  const roles = [
    { id: 1, domain: 1, subdomain: 5, parentRole: null, active: true },
    { id: 2, domain: 1, subdomain: 5, parentRole: 1, active: true },
    { id: 3, domain: 1, subdomain: 5, parentRole: null, active: true },
  ]
  const rules = [{ id: 8, domain: 1, principalType: 'Role', principal: { relationTo: 'roles', value: 1 }, resourceType: 'Subdomain', resource: { relationTo: 'subdomains', value: 5 }, capability: 'assign_subordinates', effect: 'grant', active: true }]
  const payload = {
    findByID: async ({ collection, id }: { collection: string; id: number }) => collection === 'users' ? { id: 9, isPlatformAdmin: false } : collection === 'domains' ? { id: 1, ownerUser: 99 } : collection === 'characters' ? { id: 4, status: 'active' } : collection === 'subdomains' ? { id, domain: 1 } : { id, domain: 1, subdomain: 5, parentRole: null },
    find: async ({ collection }: { collection: string }) => collection === 'roles' ? { docs: roles } : collection === 'role-assignments' ? { docs: [{ role: 1, character: 4, status: 'active' }] } : collection === 'domain-memberships' ? { docs: [{ id: 6 }] } : collection === 'permission-rules' ? { docs: rules } : collection === 'domain-admins' ? { docs: [] } : { docs: [] },
  } as never
  assert.equal(await canAssignRole(payload, { actor: { userId: 9, activeCharacterId: 4 }, domainId: 1, targetRoleId: 2 }), true)
  assert.equal(await canAssignRole(payload, { actor: { userId: 9, activeCharacterId: 4 }, domainId: 1, targetRoleId: 3 }), false)
})

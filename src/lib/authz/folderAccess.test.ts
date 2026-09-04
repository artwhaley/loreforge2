import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveFolderPermission } from './folderAccess'

test('P07-T04 explicit Character deny beats inherited Role grant', async () => {
  const rules = [
    { id: 1, domain: 1, principalType: 'Role', principal: { relationTo: 'roles', value: 10 }, resourceType: 'Folder', resource: { relationTo: 'folders', value: 2 }, capability: 'read', effect: 'grant', active: true },
    { id: 2, domain: 1, principalType: 'Character', principal: { relationTo: 'characters', value: 7 }, resourceType: 'Folder', resource: { relationTo: 'folders', value: 2 }, capability: 'read', effect: 'deny', active: true },
  ]
  const payload = {
    findByID: async ({ collection, id }: { collection: string; id: number }) => collection === 'domains' ? { id: 1, ownerUser: 99 } : collection === 'users' ? { id: 5, isPlatformAdmin: false } : collection === 'characters' ? { id: 7, status: 'active' } : { id, domain: 1, parent: null, subdomain: null, folder: 2 },
    find: async ({ collection }: { collection: string }) => collection === 'domain-memberships' ? { docs: [{ id: 4 }] } : collection === 'roles' ? { docs: [{ id: 10, domain: 1, subdomain: 3, parentRole: null, active: true }] } : collection === 'role-assignments' ? { docs: [{ role: 10, character: 7, status: 'active' }] } : collection === 'permission-rules' ? { docs: rules } : { docs: [] },
  } as never
  const result = await resolveFolderPermission({ payload, domainId: 1, actor: { userId: 5, activeCharacterId: 7 }, folderId: 2 })
  assert.equal(result.read.allowed, false)
  assert.equal(result.read.matchedRule?.effect, 'deny')
})

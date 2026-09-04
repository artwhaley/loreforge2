import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { getPayload } from 'payload'
import config from '@/payload.config'

import { deactivateDomainParticipation } from './deactivateDomainParticipation'

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}
const payloadPromise = getPayload({ config })

test('P05R-T13: Domain removal exhausts more than 500 direct Folder rules', async () => {
  const payload = await payloadPromise
  const owner = await payload.create({ collection: 'users', data: { email: 'large-removal@example.test', password: 'test-password-123', name: 'Large Removal' } } as never)
  const domain = await payload.create({ collection: 'domains', data: { name: 'Large Domain', slug: 'large-removal', kind: 'community', ownerUser: owner.id, defaultFilingPolicy: 'direct-file' } } as never)
  const character = await payload.create({ collection: 'characters', data: { name: 'Large Character', status: 'active', controlledBy: owner.id } } as never)
  const membership = await payload.create({ collection: 'domain-memberships', data: { domain: domain.id, character: character.id, status: 'active', addedBy: owner.id } } as never)
  const ruleIds: number[] = []
  for (let index = 0; index < 504; index += 1) {
    const folder = await payload.create({ collection: 'folders', data: { domain: domain.id, name: `Scale ${index}`, systemManaged: false } } as never)
    const rule = await payload.create({ collection: 'permission-rules', data: { domain: domain.id, principalType: 'Character', principal: { relationTo: 'characters', value: character.id }, resourceType: 'Folder', resource: { relationTo: 'folders', value: folder.id }, capability: 'read', effect: 'grant', active: true, actorUser: owner.id } } as never)
    ruleIds.push(Number(rule.id))
  }
  await deactivateDomainParticipation({ payload, domainId: domain.id, characterId: character.id, membershipId: membership.id, actorUser: owner.id })
  const remaining = await payload.find({ collection: 'permission-rules', where: { id: { in: ruleIds } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  assert.equal(remaining.docs.length, 0)
})

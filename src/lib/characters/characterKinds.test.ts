import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { assertCharacterKindFields } from './kinds'
import { characterDisplayLabel } from './labels'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from './provisioning'
import { decideCharacterClaim } from './decideClaim'

if (!/^file:.*p07x-kinds-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p07x-kinds-*.db; never the working DB.')

const payload = await getPayload({ config })

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

async function user(email: string, platform = false): Promise<number> {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, isPlatformAdmin: platform, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function domain(slug: string, ownerUserId: number): Promise<number> {
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'domains', overrideAccess: true, data: { slug, name: slug, ownerUser: ownerUserId, kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
  return Number(row.id)
}

async function character(data: Record<string, unknown>) {
  return payload.create({ collection: 'characters', overrideAccess: true, data: data as never })
}

const ownerUserId = await user('p07x-kinds-owner@example.test')
const otherUserId = await user('p07x-kinds-other@example.test')
const platformUserId = await user('p07x-kinds-platform@example.test', true)
const arId = await domain('p07x-kinds-ar', ownerUserId)
const bayId = await domain('p07x-kinds-bay', otherUserId)

const ownerPlayer = await character({ name: 'Kinds Owner', kind: 'player', controlledBy: ownerUserId, status: 'active' })

test('T01 pure kind vocabulary rejects unknown kinds and wrong field shapes', () => {
  assert.equal(assertCharacterKindFields({ kind: 'player' }), true)
  assert.equal(assertCharacterKindFields({ kind: 'npc' }), true)
  assert.throws(() => assertCharacterKindFields({ kind: 'administrative' }), /Unknown Character kind/)
  // Admin kinds require a controller first, then domain_admin requires scope.
  assert.throws(() => assertCharacterKindFields({ kind: 'domain_admin' }), /must be controlled by a User/)
  assert.throws(() => assertCharacterKindFields({ kind: 'domain_admin', controlledBy: ownerUserId }), /must identify exactly one administrativeDomain/)
  assert.throws(() => assertCharacterKindFields({ kind: 'domain_admin', administrativeDomain: arId }), /must be controlled by a User/)
  assert.throws(() => assertCharacterKindFields({ kind: 'platform_admin', controlledBy: platformUserId, administrativeDomain: arId }), /Only domain_admin Characters may identify an administrativeDomain/)
  assert.throws(() => assertCharacterKindFields({ kind: 'player', administrativeDomain: arId }), /Only domain_admin Characters may identify an administrativeDomain/)
})

test('T01 provisioning creates exactly one platform_admin per eligible User', async () => {
  const first = await ensurePlatformAdminIdentity(payload, platformUserId)
  assert.ok(first.reason === 'created' || first.reason === 'existing' || first.reason === 'reactivated')
  assert.ok(first.characterId != null)
  const again = await ensurePlatformAdminIdentity(payload, platformUserId)
  assert.equal(again.reason, 'existing')
  assert.equal(again.characterId, first.characterId)
  const row = await payload.findByID({ collection: 'characters', id: first.characterId as number, depth: 0, overrideAccess: true })
  assert.equal(row.kind, 'platform_admin')
  assert.equal(idOf(row.controlledBy), platformUserId)
  assert.equal(idOf(row.administrativeDomain), null)
  // second active platform_admin for the same User is rejected by the hook
  await assert.rejects(character({ name: 'Administrator 2', kind: 'platform_admin', controlledBy: platformUserId, status: 'active' }), /exactly one active platform_admin/)
})

test('T01 platform_admin cannot carry an administrativeDomain or uncontrolled status', async () => {
  await assert.rejects(character({ name: 'Bad Platform', kind: 'platform_admin', controlledBy: platformUserId, administrativeDomain: arId, status: 'active' }), /Only domain_admin Characters may identify an administrativeDomain/)
  await assert.rejects(character({ name: 'Uncontrolled Platform', kind: 'platform_admin', administrativeDomain: null, status: 'active' }), /must be controlled by a User/)
  // A non-eligible User cannot control a platform_admin Character.
  await assert.rejects(character({ name: 'Wrong Platform', kind: 'platform_admin', controlledBy: ownerUserId, status: 'active' }), /platform-admin-eligible User/)
})

test('T01 provisioning creates exactly one domain_admin per owned Community Domain', async () => {
  const first = await ensureDomainAdminIdentity(payload, arId)
  assert.ok(first.reason === 'created' || first.reason === 'existing' || first.reason === 'reactivated')
  assert.ok(first.characterId != null)
  const again = await ensureDomainAdminIdentity(payload, arId)
  assert.equal(again.reason, 'existing')
  assert.equal(again.characterId, first.characterId)
  const row = await payload.findByID({ collection: 'characters', id: first.characterId as number, depth: 0, overrideAccess: true })
  assert.equal(row.kind, 'domain_admin')
  assert.equal(idOf(row.administrativeDomain), arId)
  assert.equal(idOf(row.controlledBy), ownerUserId)
  // A second active domain_admin for the same Domain is rejected.
  await assert.rejects(character({ name: 'Second Admin of Ar', kind: 'domain_admin', controlledBy: ownerUserId, administrativeDomain: arId, status: 'active' }), /exactly one active domain_admin/)
})

test('T01 domain_admin invariants: wrong controller, wrong Domain, no controller', async () => {
  // controlled by a User who is not the Domain owner
  await assert.rejects(character({ name: 'Wrong Controller', kind: 'domain_admin', controlledBy: otherUserId, administrativeDomain: arId, status: 'active' }), /must equal the administrativeDomain ownerUser/)
  // controller owns a different Domain
  await assert.rejects(character({ name: 'Wrong Scope', kind: 'domain_admin', controlledBy: ownerUserId, administrativeDomain: bayId, status: 'active' }), /must equal the administrativeDomain ownerUser/)
  await assert.rejects(character({ name: 'No Controller', kind: 'domain_admin', administrativeDomain: arId, status: 'active' }), /must be controlled by a User/)
  await assert.rejects(character({ name: 'No Scope', kind: 'domain_admin', controlledBy: ownerUserId, status: 'active' }), /must identify exactly one administrativeDomain/)
})

test('T01 admin kinds cannot receive DomainMemberships or RoleAssignments', async () => {
  const [platformAdmin, domainAdmin] = [await ensurePlatformAdminIdentity(payload, platformUserId), await ensureDomainAdminIdentity(payload, arId)]
  const departments = await payload.find({ collection: 'subdomains', where: { domain: { equals: arId } }, depth: 0, limit: 1, overrideAccess: true })
  const role = departments.docs[0] == null
    ? await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: arId, name: 'Scribes', slug: 'scribes' } }).then(async (subdomain) => payload.create({ collection: 'roles', overrideAccess: true, data: { domain: arId, subdomain: subdomain.id, name: 'Clerk', active: true, system: false } }))
    : await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: arId, subdomain: departments.docs[0].id, name: 'Clerk', active: true, system: false } })
  for (const kind of ['domain_admin', 'platform_admin'] as const) {
    const characterId = kind === 'domain_admin' ? domainAdmin.characterId as number : platformAdmin.characterId as number
    await assert.rejects(payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: arId, character: characterId, status: 'active', addedBy: ownerUserId } }), /cannot receive DomainMemberships/)
    await assert.rejects(payload.create({ collection: 'role-assignments', overrideAccess: true, data: { character: characterId, role: role.id, status: 'active', assignedBy: ownerUserId } }), /cannot receive RoleAssignments/)
  }
})

test('T01 ordinary claim cannot target an admin kind, and deciding such a claim fails closed', async () => {
  const [platformAdmin, domainAdmin] = [await ensurePlatformAdminIdentity(payload, platformUserId), await ensureDomainAdminIdentity(payload, arId)]
  for (const characterId of [platformAdmin.characterId as number, domainAdmin.characterId as number]) {
    const claim = await payload.create({ collection: 'character-claim-requests', overrideAccess: true, data: { character: characterId, claimant: otherUserId, domain: arId, status: 'pending', requestedAt: new Date().toISOString() } })
    const decided = await decideCharacterClaim(payload, {
      actor: { userId: ownerUserId, activeCharacterId: domainAdmin.characterId as number },
      domainId: arId, characterId, claimId: Number(claim.id), decision: 'approved',
    })
    assert.equal(decided, false, `claim approval against ${String(characterId)} must fail closed`)
  }
  // Positive control: a genuine unclaimed ordinary player Character can be claimed.
  const unclaimed = await character({ name: 'Kinds Unclaimed', kind: 'player', status: 'active' })
  const okClaim = await payload.create({ collection: 'character-claim-requests', overrideAccess: true, data: { character: unclaimed.id, claimant: otherUserId, domain: arId, status: 'pending', requestedAt: new Date().toISOString() } })
  const approved = await decideCharacterClaim(payload, {
    actor: { userId: ownerUserId, activeCharacterId: domainAdmin.characterId as number },
    domainId: arId, characterId: Number(unclaimed.id), claimId: Number(okClaim.id), decision: 'approved',
  })
  assert.equal(approved, true, 'ordinary unclaimed player Character claim should succeed')
})

test('T01 selector labels follow kind', () => {
  assert.equal(characterDisplayLabel({ id: 1, name: 'X', kind: 'platform_admin' }), 'Administrator')
  assert.equal(characterDisplayLabel({ id: 2, name: 'X', kind: 'domain_admin', administrativeDomain: { id: arId, name: 'Ar' } }), 'Administrator of Ar')
  assert.equal(characterDisplayLabel({ id: 3, name: 'Lucan', kind: 'player' }), 'Lucan')
  assert.equal(characterDisplayLabel({ id: 4, name: 'Mira', kind: 'npc' }), 'Mira')
  assert.equal(characterDisplayLabel({ id: 5, name: 'Legacy', kind: null }), 'Legacy')
})

test('T01 ordinary characters cannot hold administrativeDomain and player stays default', async () => {
  await assert.rejects(character({ name: 'Player With Scope', kind: 'player', controlledBy: ownerUserId, administrativeDomain: arId, status: 'active' }), /Only domain_admin Characters/)
  const plain = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'Plain Default', controlledBy: ownerUserId, status: 'active' } as never })
  assert.equal(plain.kind, 'player')
})

void ownerPlayer
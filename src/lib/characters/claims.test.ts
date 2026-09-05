import test from 'node:test'
import assert from 'node:assert/strict'

import { applyClaimDecision, canApproveClaim } from './claims'
import { publicCharacterProjection } from './publicProjection'

test('only the interim Domain admin can decide a still-pending unclaimed Character claim', () => {
  const claim = { status: 'pending' as const, characterControlledBy: null }
  assert.match(String(canApproveClaim(claim, { userId: 8, isLegacyDomainAdmin: false })), /authorized Domain admin/)
  assert.deepEqual(
    applyClaimDecision(claim, 'approved', 42, { userId: 8, isLegacyDomainAdmin: true }),
    { status: 'approved', characterControlledBy: 42 },
  )
  assert.match(
    String(applyClaimDecision({ status: 'approved', characterControlledBy: 42 }, 'approved', 43, { userId: 8, isLegacyDomainAdmin: true })),
    /pending/,
  )
})

test('public Character projection contains only safe display fields', () => {
  const projected = publicCharacterProjection(
    { id: 1, name: 'Traveler', kind: 'player', bio: 'A profile', status: 'active', controlledBy: 2, aliases: [], createdAt: '', updatedAt: '' },
    { id: 2, collection: 'users', name: 'Morgan Vale', email: 'secret@example.test', slAvatarUUID: 'secret-sl', slAvatarName: 'Secret Resident', slVerificationState: 'verified', createdAt: '', updatedAt: '' },
  )
  assert.deepEqual(projected.controller, { name: 'Morgan Vale' })
  assert.equal('email' in projected.controller!, false)
  assert.equal('slAvatarUUID' in projected, false)
  assert.equal('controlledBy' in projected, false)
})

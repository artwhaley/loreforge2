import test from 'node:test'
import assert from 'node:assert/strict'

import { invitationStatusDescriptor } from './buildInvitationsManagementPageModel'

test('invitationStatusDescriptor maps known query params', () => {
  assert.deepEqual(invitationStatusDescriptor({ created: '1' }), { level: 'info', message: 'Invitation created.' })
  assert.deepEqual(invitationStatusDescriptor({ decided: '1' }), { level: 'info', message: 'Request decided.' })
  assert.deepEqual(invitationStatusDescriptor({ revoked: '1' }), { level: 'info', message: 'Invitation revoked.' })
  assert.deepEqual(invitationStatusDescriptor({ error: 'invalid' }), { level: 'error', message: 'That invitation action could not be completed.' })
})

test('invitationStatusDescriptor returns null when nothing is present', () => {
  assert.equal(invitationStatusDescriptor({}), null)
  assert.equal(invitationStatusDescriptor({ somethingElse: '1' } as Record<string, string>), null)
})
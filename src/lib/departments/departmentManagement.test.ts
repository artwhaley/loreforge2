import test from 'node:test'
import assert from 'node:assert/strict'

import { departmentStatusDescriptor } from './departmentStatus'

test('departmentStatusDescriptor maps known error codes to messages', () => {
  assert.deepEqual(departmentStatusDescriptor('duplicate'), { level: 'error', message: 'A Department with that name already exists.' })
  assert.deepEqual(departmentStatusDescriptor('unauthorized'), { level: 'error', message: 'You are not authorized to manage Departments with the selected acting Character.' })
})

test('departmentStatusDescriptor returns null for unknown or absent codes', () => {
  assert.equal(departmentStatusDescriptor(undefined), null)
  assert.equal(departmentStatusDescriptor('something-else'), null)
  assert.equal(departmentStatusDescriptor(''), null)
})
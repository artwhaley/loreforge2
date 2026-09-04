import test from 'node:test'
import assert from 'node:assert/strict'

import { adaptPayloadFormFields } from './adapter-payload'

test('P06-T02 adapter converts the supported Payload subset and warns on unsupported blocks', () => {
  const result = adaptPayloadFormFields([
    { blockType: 'text', name: 'name', label: 'Name', required: true },
    { blockType: 'select', name: 'kind', label: 'Kind', options: [{ label: 'Other', value: 'other' }] },
    { blockType: 'email', name: 'email', label: 'Email' },
  ])
  assert.deepEqual(result.schema.fields.map((field) => field.key), ['name', 'kind'])
  assert.equal(result.schema.fields[1].options?.[0].value, 'other')
  assert.equal(result.warnings.length, 1)
})


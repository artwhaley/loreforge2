import test from 'node:test'
import assert from 'node:assert/strict'

import { assertFormSchema, validateFormSchema } from './schema'

test('P06-T02 neutral schema accepts stable supported fields', () => {
  const result = validateFormSchema({ version: 1, fields: [
    { key: 'incident_date', type: 'date', label: 'Incident date', required: true },
    { key: 'officer', type: 'character', label: 'Officer' },
    { key: 'kind', type: 'select', label: 'Kind', options: [{ label: 'Other', value: 'other' }] },
  ] })
  assert.equal(result.valid, true)
  if (result.valid) assert.equal(result.value.fields[1].type, 'character')
})

test('P06-T02 neutral schema rejects duplicate keys and select without options', () => {
  const result = validateFormSchema({ version: 1, fields: [
    { key: 'kind', type: 'select', label: 'Kind' },
    { key: 'kind', type: 'text', label: 'Duplicate' },
  ] })
  assert.equal(result.valid, false)
  if (!result.valid) assert.ok(result.issues.some((item) => item.path.includes('options')))
  assert.throws(() => assertFormSchema({ version: 1, fields: [{ key: 'bad-key', type: 'text', label: 'Bad' }] }))
})


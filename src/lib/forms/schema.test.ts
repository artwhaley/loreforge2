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

test('P06R additive presentation hints round-trip and older schemas stay valid', () => {
  const result = validateFormSchema({ version: 1, fields: [
    { key: 'story', type: 'textarea', label: 'Story', help: 'Say what you saw.', width: 'medium', rows: 6, default: 'Nothing to report', required: true },
    { key: 'consent', type: 'checkbox', label: 'Consent', default: true },
  ] })
  assert.equal(result.valid, true)
  if (result.valid) {
    assert.equal(result.value.fields[0].width, 'medium')
    assert.equal(result.value.fields[0].rows, 6)
    assert.equal(result.value.fields[0].help, 'Say what you saw.')
    assert.equal(result.value.fields[0].default, 'Nothing to report')
    assert.equal(result.value.fields[1].default, true)
  }
  // A schema stored before the hints existed (no width/rows) still validates
  // and is not rewritten with invented values.
  const legacy = validateFormSchema({ version: 1, fields: [{ key: 'story', type: 'textarea', label: 'Story' }] })
  assert.equal(legacy.valid, true)
  if (legacy.valid) assert.equal(legacy.value.fields[0].rows, undefined)
})

test('P06R rejects invalid width and rows values instead of coercing', () => {
  const badWidth = validateFormSchema({ version: 1, fields: [{ key: 'q', type: 'text', label: 'Q', width: 'huge' }] })
  assert.equal(badWidth.valid, false)
  const badRows = validateFormSchema({ version: 1, fields: [{ key: 'q', type: 'textarea', label: 'Q', rows: 2 }] })
  assert.equal(badRows.valid, false)
  const floatRows = validateFormSchema({ version: 1, fields: [{ key: 'q', type: 'textarea', label: 'Q', rows: 4.5 }] })
  assert.equal(floatRows.valid, false)
})

test('P06R multiple-Characters question validates and keeps its relationship label', () => {
  const result = validateFormSchema({ version: 1, fields: [
    { key: 'witnesses', type: 'characters', label: 'Witnesses', required: true, relationshipLabel: 'witness', width: 'full' },
    { key: 'officer', type: 'character', label: 'Officer', relationshipLabel: 'officer' },
  ] })
  assert.equal(result.valid, true)
  if (result.valid) {
    assert.equal(result.value.fields[0].type, 'characters')
    assert.equal(result.value.fields[0].relationshipLabel, 'witness')
  }
  // Options stay select-only; relationship labels stay Character-only.
  const optionsOnCharacters = validateFormSchema({ version: 1, fields: [{ key: 'witnesses', type: 'characters', label: 'Witnesses', options: [{ label: 'x', value: 'x' }] }] })
  assert.equal(optionsOnCharacters.valid, false)
  const labelOnText = validateFormSchema({ version: 1, fields: [{ key: 'q', type: 'text', label: 'Q', relationshipLabel: 'x' }] })
  assert.equal(labelOnText.valid, false)
  const unsupported = validateFormSchema({ version: 1, fields: [{ key: 'q', type: 'cast', label: 'Q' }] })
  assert.equal(unsupported.valid, false)
})


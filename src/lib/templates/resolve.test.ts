import test from 'node:test'
import assert from 'node:assert/strict'

import { isTemplateAvailableAt } from './resolve'

const folders = [
  { id: 1, domain: 10, parent: null },
  { id: 2, domain: 10, parent: 1 },
  { id: 3, domain: 10, parent: 2 },
]

test('P06-T01 availability follows scope folder and descendant toggle', () => {
  const template = { id: 1, domain: 10, scopeFolder: 2, destinationFolder: 2, availableToDescendants: true, active: true }
  assert.equal(isTemplateAvailableAt(template, folders[2], folders), true)
  assert.equal(isTemplateAvailableAt({ ...template, availableToDescendants: false }, folders[2], folders), false)
  assert.equal(isTemplateAvailableAt(template, { id: 8, domain: 11, parent: 2 }, folders), false)
})


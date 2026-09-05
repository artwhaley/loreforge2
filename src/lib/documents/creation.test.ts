import assert from 'node:assert/strict'
import test from 'node:test'

import { effectiveCreationMethods, initialRouteFolder } from './creation'

test('effective creation methods require enabled flags and matching live children', () => {
  const type = { id: 7, allowBlank: true, allowTemplate: true, allowForm: true }
  const children = [
    { id: 11, kind: 'document' as const, active: true, documentType: 7 },
    { id: 12, kind: 'form' as const, active: true, documentType: 7 },
    { id: 13, kind: 'form' as const, active: false, documentType: 7 },
    { id: 14, kind: 'document' as const, active: true, documentType: 99 },
  ]
  assert.deepEqual(effectiveCreationMethods(type, children), ['blank', 'template', 'form'])
  assert.deepEqual(effectiveCreationMethods({ ...type, allowBlank: false }, children), ['template', 'form'])
  assert.deepEqual(effectiveCreationMethods({ ...type, allowTemplate: false }, children), ['blank', 'form'])
  assert.deepEqual(effectiveCreationMethods({ ...type, allowForm: false }, children), ['blank', 'template'])
  assert.deepEqual(effectiveCreationMethods({ id: 7, allowBlank: false, allowTemplate: true, allowForm: true }, [children[3]]), [])
})

test('pre-P07X Types keep blank creation as the compatibility default', () => {
  assert.deepEqual(effectiveCreationMethods({ id: 1 }, []), ['blank'])
})

test('initial route folder delegates to lifecycle routing and falls back safely', () => {
  const type = { defaultFolder: 10, draftFolder: 11, filedFolder: 12 }
  assert.equal(initialRouteFolder(type, 'draft', null), 11)
  assert.equal(initialRouteFolder(type, 'pending_review', null), 10)
  assert.equal(initialRouteFolder(null, 'draft', 99), 99)
})

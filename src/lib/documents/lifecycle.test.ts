import test from 'node:test'
import assert from 'node:assert/strict'

import { assertLifecycleTransition, canEditDocumentBody, resolveFilingPolicy } from './lifecycle'

test('filing policy resolves Template > Folder > Type > Domain', () => {
  assert.equal(resolveFilingPolicy({ domain: 'review-required', documentType: 'direct-file', folder: 'review-required', template: 'direct-file' }), 'direct-file')
  assert.equal(resolveFilingPolicy({ domain: 'direct-file', documentType: 'direct-file', folder: 'review-required' }), 'review-required')
  assert.equal(resolveFilingPolicy({ domain: 'review-required', documentType: 'direct-file' }), 'direct-file')
  assert.equal(resolveFilingPolicy({ domain: 'review-required' }), 'review-required')
})

test('lifecycle transition table is explicit', () => {
  assert.doesNotThrow(() => assertLifecycleTransition('draft', 'pending_review'))
  assert.doesNotThrow(() => assertLifecycleTransition('pending_review', 'draft'))
  assert.doesNotThrow(() => assertLifecycleTransition('filed', 'locked'))
  assert.doesNotThrow(() => assertLifecycleTransition('locked', 'filed'))
  assert.throws(() => assertLifecycleTransition('draft', 'locked'))
  assert.throws(() => assertLifecycleTransition('pending_review', 'locked'))
})

test('pending review and locked bodies are frozen', () => {
  assert.equal(canEditDocumentBody('draft'), true)
  assert.equal(canEditDocumentBody('filed'), true)
  assert.equal(canEditDocumentBody('pending_review'), false)
  assert.equal(canEditDocumentBody('locked'), false)
})

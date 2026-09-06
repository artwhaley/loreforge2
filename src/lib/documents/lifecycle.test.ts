import test from 'node:test'
import assert from 'node:assert/strict'

import { assertLifecycleTransition, canEditDocumentBody, canSupersedeDocument, resolveFilingPolicy } from './lifecycle'

test('filing policy resolves Template > Folder > Type > Domain', () => {
  assert.equal(resolveFilingPolicy({ domain: 'review-required', documentType: 'direct-file', folder: 'review-required', template: 'direct-file' }), 'direct-file')
  assert.equal(resolveFilingPolicy({ domain: 'direct-file', documentType: 'direct-file', folder: 'review-required' }), 'review-required')
  assert.equal(resolveFilingPolicy({ domain: 'review-required', documentType: 'direct-file' }), 'direct-file')
  assert.equal(resolveFilingPolicy({ domain: 'review-required' }), 'review-required')
})

test('lifecycle transition table is explicit', () => {
  assert.doesNotThrow(() => assertLifecycleTransition('draft', 'submitted'))
  assert.doesNotThrow(() => assertLifecycleTransition('submitted', 'draft'))
  assert.doesNotThrow(() => assertLifecycleTransition('submitted', 'filed'))
  assert.doesNotThrow(() => assertLifecycleTransition('draft', 'filed'))
  assert.doesNotThrow(() => assertLifecycleTransition('filed', 'deprecated'))
  assert.doesNotThrow(() => assertLifecycleTransition('deprecated', 'filed'))
  assert.throws(() => assertLifecycleTransition('draft', 'deprecated'))
  assert.throws(() => assertLifecycleTransition('submitted', 'deprecated'))
  assert.throws(() => assertLifecycleTransition('filed', 'draft'))
})

test('submitted and deprecated bodies are frozen; the locked flag blocks editing everywhere', () => {
  assert.equal(canEditDocumentBody('draft', false), true)
  assert.equal(canEditDocumentBody('filed', false), true)
  assert.equal(canEditDocumentBody('submitted', false), false)
  assert.equal(canEditDocumentBody('deprecated', false), false)
  assert.equal(canEditDocumentBody('draft', true), false)
  assert.equal(canEditDocumentBody('filed', true), false)
  assert.equal(canEditDocumentBody('submitted', true), false)
  assert.equal(canEditDocumentBody('deprecated', true), false)
})

test('supersession eligibility is Filed or Deprecated; locked is not a stage', () => {
  assert.equal(canSupersedeDocument('filed'), true)
  assert.equal(canSupersedeDocument('deprecated'), true)
  assert.equal(canSupersedeDocument('draft'), false)
  assert.equal(canSupersedeDocument('submitted'), false)
})
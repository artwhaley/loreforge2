import assert from 'node:assert/strict'
import test from 'node:test'

import {
  pickDesignKey,
  validateDomainDesignConfig,
} from './config.js'

/**
 * Design-registry seam: persisted JSON configs validate strictly, and unknown
 * keys resolve to the Civic default. (Node-harness twin of the Vitest config
 * suite; security-relevant because a malformed stored config must never widen
 * what a Design can render.)
 */

const jsonConfig = {
  schemaVersion: 1,
  designKey: 'atelier',
  common: {
    primaryColor: '#123456',
    secondaryColor: '#234567',
    accentColor: '#345678',
    backgroundColor: '#456789',
    headingFontKey: 'newsreader',
    bodyFontKey: 'lato',
  },
  options: { headerLayout: 'left-aligned', documentStyle: 'classic' },
  design: {},
}

test('validateDomainDesignConfig accepts a well-formed config', () => {
  const parsed = validateDomainDesignConfig(jsonConfig)
  assert.ok(parsed)
  assert.equal(parsed?.designKey, 'atelier')
})

test('validateDomainDesignConfig rejects malformed configs', () => {
  assert.equal(validateDomainDesignConfig(null), null)
  assert.equal(validateDomainDesignConfig('{"schemaVersion":1}'), null)
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, schemaVersion: 2 }), null)
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, designKey: 'gazette' }), null)
  // Retired design keys are no longer valid persisted keys.
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, designKey: 'ledger' }), null)
  assert.equal(
    validateDomainDesignConfig({ ...jsonConfig, common: { ...jsonConfig.common, primaryColor: 'red' } }),
    null,
  )
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, design: [] }), null)
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, options: { headerLayout: 42 } }), null)
})

test('pickDesignKey resolves registered keys and falls back to Civic', () => {
  assert.equal(pickDesignKey('obsidian'), 'obsidian')
  assert.equal(pickDesignKey('atelier'), 'atelier')
  assert.equal(pickDesignKey('gazette'), 'civic')
  assert.equal(pickDesignKey('ledger'), 'civic')
  assert.equal(pickDesignKey(undefined), 'civic')
})
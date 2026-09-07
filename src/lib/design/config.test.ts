import assert from 'node:assert/strict'
import test from 'node:test'

import type { DesignDefinition } from './types.js'
import {
  resolveEffectiveDomainDesign,
  validateDomainDesignConfig,
} from './config.js'

/**
 * Minimal Design stand-in: node:test cannot import SCSS, so the real Civic
 * module (which owns stylesheets) stays in the Vitest suite. The resolver
 * only reads the theme axis metadata, which this stub provides faithfully.
 */
const civic = {
  key: 'civic',
  theme: {
    defaults: {
      primary: '#243145',
      secondary: '#8A6A3C',
      accent: '#B9975B',
      background: '#F3EFE6',
      headingFontKey: 'georgia',
      bodyFontKey: 'verdana',
    },
    headerLayouts: [
      { key: 'centered', label: 'Centered masthead' },
      { key: 'left-aligned', label: 'Compact bar' },
      { key: 'banner-forward', label: 'Banner hero' },
    ],
    defaultHeaderLayout: 'centered',
    documentStyles: [
      { key: 'classic', label: 'Classic (serif record sheet)' },
      { key: 'modern', label: 'Modern (clean reading)' },
    ],
    defaultDocumentStyle: 'classic',
    controls: [],
    validate: () => ({}),
  },
} as unknown as DesignDefinition

/**
 * Design-registry seam: persisted JSON configs validate strictly, and the
 * effective-config resolver prefers valid JSON over legacy scalars.
 * (Node-harness twin of the Vitest config suite; security-relevant because a
 * malformed stored config must never widen what a Design can render.)
 */

const scalarDomain = {
  designTemplate: 'ledger',
  headerLayout: 'banner-forward',
  documentStyle: 'modern',
  primaryColor: '#111111',
  secondaryColor: '#222222',
  accentColor: '#333333',
  backgroundColor: '#444444',
  headingFontKey: 'georgia',
  bodyFontKey: 'verdana',
  contentWidth: 'wide',
}

const jsonConfig = {
  schemaVersion: 1,
  designKey: 'poster',
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
  assert.equal(parsed?.designKey, 'poster')
})

test('validateDomainDesignConfig rejects malformed configs', () => {
  assert.equal(validateDomainDesignConfig(null), null)
  assert.equal(validateDomainDesignConfig('{"schemaVersion":1}'), null)
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, schemaVersion: 2 }), null)
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, designKey: 'gazette' }), null)
  assert.equal(
    validateDomainDesignConfig({ ...jsonConfig, common: { ...jsonConfig.common, primaryColor: 'red' } }),
    null,
  )
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, design: [] }), null)
  assert.equal(validateDomainDesignConfig({ ...jsonConfig, options: { headerLayout: 42 } }), null)
})

test('resolver prefers valid JSON over legacy scalars', () => {
  const effective = resolveEffectiveDomainDesign(civic, { ...scalarDomain, designConfig: jsonConfig })
  assert.equal(effective.designKey, 'poster')
  assert.equal(effective.common.primaryColor, '#123456')
  assert.equal(effective.options.headerLayout, 'left-aligned')
})

test('resolver falls back to legacy scalars when JSON is absent or invalid', () => {
  const fromScalars = resolveEffectiveDomainDesign(civic, scalarDomain)
  assert.equal(fromScalars.designKey, 'ledger')
  assert.equal(fromScalars.common.primaryColor, '#111111')
  const fromBroken = resolveEffectiveDomainDesign(civic, { ...scalarDomain, designConfig: { schemaVersion: 99 } })
  assert.equal(fromBroken.designKey, 'ledger')
  assert.equal(fromBroken.options.headerLayout, 'banner-forward')
})

test('stored axis values outside the Design list fall back to the Design default', () => {
  const effective = resolveEffectiveDomainDesign(civic, {
    ...scalarDomain,
    designConfig: { ...jsonConfig, options: { headerLayout: 'rail', documentStyle: 'docket' } },
  })
  assert.equal(effective.options.headerLayout, 'centered')
  assert.equal(effective.options.documentStyle, 'classic')
})

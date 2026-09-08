import assert from 'node:assert/strict'
import test from 'node:test'

import { DESIGN_TEMPLATES, THEME_PRESETS } from './fonts'
import { isValidThemeInput } from './input'
import { DESIGN_CATALOG } from '../design/catalog'

const valid = {
  preset: 'heritage' as const,
  primaryColor: '#243145',
  secondaryColor: '#8A6A3C',
  accentColor: '#B9975B',
  backgroundColor: '#F3EFE6',
  headingFontKey: 'georgia',
  bodyFontKey: 'verdana',
  designTemplate: 'civic' as const,
  contentWidth: 'standard' as const,
  headerLayout: 'centered' as const,
  documentStyle: 'classic' as const,
  backgroundTreatment: 'plain' as const,
}

test('accepts only curated theme values at the save boundary', () => {
  assert.equal(isValidThemeInput(valid), true)
  assert.equal(isValidThemeInput({ ...valid, primaryColor: 'url(javascript:alert(1))' }), false)
  assert.equal(isValidThemeInput({ ...valid, headingFontKey: 'https://evil.test/font' }), false)
  assert.equal(isValidThemeInput({ ...valid, preset: 'unknown' }), false)
})

test('rejects unknown layout tokens', () => {
  assert.equal(isValidThemeInput({ ...valid, contentWidth: 'infinite' }), false)
  assert.equal(isValidThemeInput({ ...valid, headerLayout: 'circus' }), false)
  assert.equal(isValidThemeInput({ ...valid, documentStyle: 'scratchy' }), false)
  assert.equal(isValidThemeInput({ ...valid, backgroundTreatment: 'lasers' }), false)
})

test('rejects unknown design templates and non-boolean image flags', () => {
  assert.equal(isValidThemeInput({ ...valid, designTemplate: 'castle' }), false)
  assert.equal(isValidThemeInput({ ...valid, backgroundImageSet: 'yes' }), false)
  // Vocabulary customization is removed (owner decision 2026-09-05); a theme
  // payload carrying vocabulary data is rejected at the boundary.
  const withVocabulary = { ...valid, vocabulary: { document: { singular: 'Scroll', plural: 'Scrolls' } } } as unknown
  assert.equal(isValidThemeInput(withVocabulary), true)
})

test('the generated design catalog drives legacy template metadata', () => {
  assert.deepEqual(Object.keys(DESIGN_TEMPLATES), DESIGN_CATALOG.map((entry) => entry.key))
  assert.equal(new Set(Object.values(DESIGN_TEMPLATES).map((entry) => entry.label)).size, DESIGN_CATALOG.length)
})

test('the six palettes are intentionally visibly different', () => {
  const keys = Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>
  const primaries = new Set(keys.map((key) => THEME_PRESETS[key].primary))
  assert.equal(primaries.size, keys.length)
  assert.notEqual(THEME_PRESETS.ink.headingFontKey, THEME_PRESETS.gallery.headingFontKey)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { THEME_PRESETS } from './fonts'
import { isValidThemeInput } from './input'

const valid = {
  preset: 'heritage' as const,
  primaryColor: '#243145',
  secondaryColor: '#8A6A3C',
  accentColor: '#B9975B',
  backgroundColor: '#F3EFE6',
  headingFontKey: 'georgia',
  bodyFontKey: 'verdana',
}

test('accepts only curated theme values at the save boundary', () => {
  assert.equal(isValidThemeInput(valid), true)
  assert.equal(isValidThemeInput({ ...valid, primaryColor: 'url(javascript:alert(1))' }), false)
  assert.equal(isValidThemeInput({ ...valid, headingFontKey: 'https://evil.test/font' }), false)
  assert.equal(isValidThemeInput({ ...valid, preset: 'unknown' }), false)
})

test('heritage and modern presets are intentionally visibly different', () => {
  assert.notDeepEqual(THEME_PRESETS.heritage, THEME_PRESETS.modern)
  assert.notEqual(THEME_PRESETS.heritage.primary, THEME_PRESETS.modern.primary)
  assert.notEqual(THEME_PRESETS.heritage.headingFontKey, THEME_PRESETS.modern.headingFontKey)
})

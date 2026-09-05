import assert from 'node:assert/strict'
import test from 'node:test'

import { contrastRatio, contrastWarnings, hexToRgb, mixColors, readableTextColor, relativeLuminance } from './color'

test('hexToRgb parses valid hex and rejects the rest', () => {
  assert.deepEqual(hexToRgb('#FF8800'), { r: 255, g: 136, b: 0 })
  assert.equal(hexToRgb('orange'), null)
  assert.equal(hexToRgb('#12345'), null)
  assert.equal(hexToRgb(''), null)
})

test('relativeLuminance and contrastRatio follow WCAG expectations', () => {
  assert.equal(relativeLuminance('#FFFFFF'), 1)
  assert.equal(relativeLuminance('#000000'), 0)
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21)
  assert.ok(contrastRatio('#777777', '#FFFFFF') > 4.5)
  assert.ok(contrastRatio('#777777', '#FFFFFF') < 5)
  // malformed input never NaNs
  assert.ok(Number.isFinite(contrastRatio('bogus', '#FFFFFF')))
})

test('readableTextColor picks the higher-contrast option', () => {
  assert.equal(readableTextColor('#243145'), '#FFFFFF')
  assert.equal(readableTextColor('#F3EFE6'), '#1A1A1A')
})

test('mixColors interpolates linearly and clamps', () => {
  assert.equal(mixColors('#000000', '#FFFFFF', 0.5), '#808080')
  assert.equal(mixColors('#000000', '#FFFFFF', 0), '#000000')
  assert.equal(mixColors('#000000', '#FFFFFF', 1), '#FFFFFF')
  assert.equal(mixColors('#000000', '#FFFFFF', 9), '#FFFFFF')
  assert.equal(mixColors('bogus', '#FFFFFF', 0.5), '#808080')
})

test('contrastWarnings flags unreadable combos and stays quiet on accessible ones', () => {
  const loud = contrastWarnings({ primary: '#8888AA', secondary: '#8888AA', accent: '#8888AA', backgroundColor: '#878787' })
  assert.ok(loud.length > 0)
  const calm = contrastWarnings({ primary: '#243145', secondary: '#8A6A3C', accent: '#B9975B', backgroundColor: '#F3EFE6' })
  assert.deepEqual(calm, [])
})

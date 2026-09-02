import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import type { Tenant } from '@/payload-types'

import { resolveThemeTokens, themeTokensToCssVars } from './fonts.js'

function makeTenant(overrides: Partial<Pick<Tenant, 'headingFontKey' | 'bodyFontKey'>>): Tenant {
  return {
    id: 1,
    name: 'T',
    slug: 't',
    motto: '',
    preset: 'heritage',
    primaryColor: '#243145',
    secondaryColor: '#8A6A3C',
    accentColor: '#B9975B',
    backgroundColor: '#F3EFE6',
    headingFontKey: 'georgia',
    bodyFontKey: 'verdana',
    ...overrides,
  } as Tenant
}

test('resolveThemeTokens maps curated font keys to stacks', () => {
  const tokens = resolveThemeTokens(makeTenant({ headingFontKey: 'palatino' }))
  assert.match(tokens.headingFont, /Palatino/)
  assert.match(tokens.bodyFont, /Verdana/)
})

test('resolveThemeTokens falls back to a readable default for unknown font', () => {
  const tokens = resolveThemeTokens(
    makeTenant({ headingFontKey: 'not-a-real-font' as Tenant['headingFontKey'] }),
  )
  assert.match(tokens.headingFont, /Verdana/)
})

test('themeTokensToCssVars emits semantic token key names', () => {
  const vars = themeTokensToCssVars(resolveThemeTokens(makeTenant({})))
  assert.ok('--tenant-primary' in vars)
  assert.ok('--tenant-heading-font' in vars)
  assert.ok('--tenant-body-font' in vars)
})

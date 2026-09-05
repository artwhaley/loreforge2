import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import type { Tenant } from '@/payload-types'

import { resolveThemeTokens, themeTokensToCssVars } from './fonts.js'

function makeTenant(overrides: Partial<Pick<Tenant, 'headingFontKey' | 'bodyFontKey' | 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'contentWidth' | 'headerLayout' | 'documentStyle' | 'backgroundTreatment'>>): Tenant {
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

test('the Loreforge brand faces are curated options', () => {
  const tokens = resolveThemeTokens(makeTenant({ headingFontKey: 'newsreader' as Tenant['headingFontKey'], bodyFontKey: 'lato' as Tenant['bodyFontKey'] }))
  assert.match(tokens.headingFont, /Newsreader/)
  assert.match(tokens.bodyFont, /Lato/)
})

test('themeTokensToCssVars emits semantic token key names', () => {
  const vars = themeTokensToCssVars(resolveThemeTokens(makeTenant({})))
  assert.ok('--tenant-primary' in vars)
  assert.ok('--tenant-heading-font' in vars)
  assert.ok('--tenant-body-font' in vars)
  assert.ok('--tenant-template' in vars)
})

test('design template token resolves with a safe platform default', () => {
  const tokens = resolveThemeTokens(makeTenant({}))
  assert.equal(tokens.designTemplate, 'civic')
  assert.equal(themeTokensToCssVars(tokens)['--tenant-template'], 'civic')
})

test('content width token selects the contracted shell caps', () => {
  assert.match(themeTokensToCssVars(resolveThemeTokens(makeTenant({ contentWidth: 'narrow' as never })))['--tenant-shell-width'], /900px/)
  assert.match(themeTokensToCssVars(resolveThemeTokens(makeTenant({ contentWidth: 'wide' as never })))['--tenant-shell-width'], /1400px/)
  // Unknown/legacy values fall back to the platform default, never blank CSS.
  assert.match(themeTokensToCssVars(resolveThemeTokens(makeTenant({ contentWidth: 'gigantic' as never })))['--tenant-shell-width'], /1200px/)
})

test('derived surfaces compute from the palette, not fixed constants', () => {
  const heritage = resolveThemeTokens(makeTenant({}))
  const modern = resolveThemeTokens(makeTenant({ primaryColor: '#123C5A', backgroundColor: '#F8FAFC', secondaryColor: '#E8EDF1', accentColor: '#21A4B8' }))
  assert.notEqual(heritage.mutedText, modern.mutedText)
  assert.notEqual(heritage.surfaceBg, modern.surfaceBg)
  // text on primary is derived to be readable, not hardcoded white
  const pale = resolveThemeTokens(makeTenant({ primaryColor: '#F0EFEA' }))
  assert.notEqual(pale.textOnPrimary, '#FFFFFF')
})
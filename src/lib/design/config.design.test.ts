import { describe, expect, it } from 'vitest'

import { legacyThemeOf, pickDesignKey, pickDesignOption, resolveDocumentStyle, resolveEffectiveDomainDesign, resolveHeaderLayout } from '@/lib/design/config'
import { civic } from '@/designs/civic'

/** Compatibility resolution: legacy scalars become a validated structured config. */
describe('design config resolution', () => {
  it('picks known design keys and falls back to Civic', () => {
    expect(pickDesignKey('ledger')).toBe('ledger')
    expect(pickDesignKey('poster')).toBe('poster')
    expect(pickDesignKey('obsidian')).toBe('obsidian')
    expect(pickDesignKey('gazette')).toBe('civic')
    expect(pickDesignKey(undefined)).toBe('civic')
  })

  it('picks supported axis options and falls back to the Design default', () => {
    expect(pickDesignOption(civic, 'headerLayout', 'banner-forward')).toBe('banner-forward')
    expect(pickDesignOption(civic, 'headerLayout', 'rail')).toBe('centered')
    expect(pickDesignOption(civic, 'documentStyle', 'modern')).toBe('modern')
    expect(pickDesignOption(civic, 'documentStyle', 'docket')).toBe('classic')
  })

  it('builds an effective config from legacy scalar fields', () => {
    const config = resolveEffectiveDomainDesign(civic, {
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
    })
    expect(config.schemaVersion).toBe(1)
    expect(config.designKey).toBe('ledger')
    expect(config.options.headerLayout).toBe('banner-forward')
    expect(config.options.documentStyle).toBe('modern')
    expect(config.common.primaryColor).toBe('#111111')
    expect(config.common.contentWidth).toBe('wide')
  })

  it('falls back to Design defaults for missing or invalid legacy values', () => {
    const config = resolveEffectiveDomainDesign(civic, { designTemplate: 'nope', headerLayout: 'rail' })
    expect(config.designKey).toBe('civic')
    expect(config.options.headerLayout).toBe('centered')
    expect(config.common.primaryColor).toBe(legacyThemeOf(civic).defaults.primary)
  })

  it('axis resolvers never crash public rendering on obsolete values', () => {
    expect(resolveHeaderLayout(civic, { headerLayout: 'rail' })).toBe('centered')
    expect(resolveDocumentStyle(civic, { documentStyle: 'docket' })).toBe('classic')
  })
})

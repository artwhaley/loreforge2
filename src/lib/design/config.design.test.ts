import { describe, expect, it } from 'vitest'

import { pickDesignKey, resolveDocumentStyle, resolveHeaderLayout } from '@/lib/design/config'

/** Compatibility resolution: legacy scalars become a validated structured config. */
describe('design config resolution', () => {
  it('picks known design keys and falls back to Civic', () => {
    expect(pickDesignKey('obsidian')).toBe('obsidian')
    expect(pickDesignKey('atelier')).toBe('atelier')
    // Retired design keys fall back to Civic like any unknown key.
    expect(pickDesignKey('ledger')).toBe('civic')
    expect(pickDesignKey('poster')).toBe('civic')
    expect(pickDesignKey('gazette')).toBe('civic')
    expect(pickDesignKey(undefined)).toBe('civic')
  })

  it('axis resolvers project known legacy scalars and fall back to defaults', () => {
    expect(resolveHeaderLayout({}, { headerLayout: 'banner-forward' })).toBe('banner-forward')
    expect(resolveHeaderLayout({}, { headerLayout: 'left-aligned' })).toBe('left-aligned')
    expect(resolveHeaderLayout({}, { headerLayout: 'rail' })).toBe('centered')
    expect(resolveDocumentStyle({}, { documentStyle: 'modern' })).toBe('modern')
    expect(resolveDocumentStyle({}, { documentStyle: 'docket' })).toBe('classic')
  })
})
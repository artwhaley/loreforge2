import { describe, expect, it } from 'vitest'

import { DESIGN_KEYS, DESIGN_METADATA, DESIGNS, resolveDesign } from '@/lib/design/registry'
import { isDesignKey } from '@/lib/design/types'

/** Stage C smoke: the registry resolves, falls back safely, and every Design is complete. */
describe('design registry', () => {
  it('registers exactly civic, ledger, and poster', () => {
    expect(DESIGN_KEYS).toEqual(['civic', 'ledger', 'poster'])
    expect(DESIGN_METADATA.map((entry) => entry.key)).toEqual(DESIGN_KEYS)
  })

  it('resolves known keys and falls back to Civic for unknown/stale keys', () => {
    expect(resolveDesign('civic').key).toBe('civic')
    expect(resolveDesign('ledger').key).toBe('ledger')
    expect(resolveDesign('poster').key).toBe('poster')
    expect(resolveDesign('obsidian').key).toBe('civic')
    expect(resolveDesign(undefined).key).toBe('civic')
    expect(resolveDesign(null).key).toBe('civic')
  })

  it('every Design exposes a Shell, all seven page views, and owned visual axes', () => {
    for (const key of DESIGN_KEYS) {
      const design = DESIGNS[key]
      expect(design.key).toBe(key)
      expect(typeof design.Shell).toBe('function')
      for (const page of ['home', 'records', 'document', 'departments', 'department', 'about', 'lore'] as const) {
        expect(typeof design.pages[page], `${key}.pages.${page}`).toBe('function')
      }
      expect(design.theme.headerLayouts.length).toBeGreaterThan(0)
      expect(design.theme.documentStyles.length).toBeGreaterThan(0)
      expect(typeof design.theme.validate).toBe('function')
    }
  })

  it('isDesignKey narrows only the three registered keys', () => {
    expect(isDesignKey('civic')).toBe(true)
    expect(isDesignKey('gazette')).toBe(false)
  })
})

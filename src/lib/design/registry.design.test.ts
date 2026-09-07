import { describe, expect, it } from 'vitest'

import { DESIGN_KEYS, DESIGN_METADATA, DESIGNS, resolveDesign } from '@/lib/design/registry'
import { isDesignKey } from '@/lib/design/types'
import { DESIGN_CATALOG, FIRST_CLASS_DESIGNS } from '@/lib/design/catalog'
import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'

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

  it('every Design exposes a Shell, all seven page views, and the first-class config+studio contract', () => {
    for (const key of DESIGN_KEYS) {
      const design = DESIGNS[key]
      expect(design.key).toBe(key)
      expect(typeof design.Shell).toBe('function')
      for (const page of ['home', 'records', 'document', 'departments', 'department', 'about', 'lore'] as const) {
        expect(typeof design.pages[page], `${key}.pages.${page}`).toBe('function')
      }
      expect(['first-class', 'compatibility']).toContain(design.status)
      expect(typeof design.config.version).toBe('number')
      expect(typeof design.config.defaults).toBe('object')
      expect(typeof design.config.validate).toBe('function')
      expect(typeof design.config.migrate).toBe('function')
      expect(typeof design.config.resolveTheme).toBe('function')
      expect(typeof design.studio.Editor).toBe('function')
    }
  })

  it('the pure catalog matches the registry and the status contract', () => {
    expect(DESIGN_CATALOG.map((entry) => entry.key)).toEqual(DESIGN_KEYS)
    expect(DESIGN_METADATA.map((entry) => entry.status)).toEqual(DESIGN_CATALOG.map((entry) => entry.status))
    // During the transition Civic/Ledger remain compatibility until T06/T07;
    // Poster is compatibility for the whole milestone.
    expect(FIRST_CLASS_DESIGNS).toEqual([])
    expect(DESIGNS.poster.status).toBe('compatibility')
  })

  it('Civic and Ledger speak different config vocabularies — no shared HEADER_LAYOUTS validator', () => {
    const civicConfig = civic.config.defaults
    const ledgerConfig = ledger.config.defaults
    // Civic vocabulary:
    expect(civicConfig.layout.header).toBe('centered')
    expect(civicConfig.document.treatment).toBe('classic')
    // Ledger vocabulary — rail, rules, register/docket; no layout.header at all.
    expect(ledgerConfig.rail.width).toBe('standard')
    expect(ledgerConfig.rules.strength).toBe('standard')
    expect(ledgerConfig.document.treatment).toBe('register')
    expect('layout' in ledgerConfig).toBe(false)
    expect('headerLayout' in ledgerConfig).toBe(false)
    // Poster stays a compatibility Design with its own small vocabulary.
    expect(poster.config.defaults.masthead.treatment).toBe('bold')
  })

  it('isDesignKey narrows only the three registered keys', () => {
    expect(isDesignKey('civic')).toBe(true)
    expect(isDesignKey('gazette')).toBe(false)
  })
})

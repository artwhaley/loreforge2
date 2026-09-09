import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'
import { serializeDesignTheme } from '@/lib/design/themeTokens'
import { DESIGN_CATALOG, DESIGN_CATALOG_KEYS } from '@/lib/design/catalog'

/**
 * P08D-T03 contract tests: each Design's own config vocabulary is validated
 * by ITS validator, migrates from its own version, adapts legacy scalars, and
 * resolves to the universal bridge plus Design-namespaced vars.
 */
describe('Civic config v1', () => {
  it('validates a complete config and rejects foreign/unknown concepts', () => {
    const result = civic.config.validate(civic.config.defaults)
    expect(result.ok).toBe(true)
    const invalid = civic.config.validate({ palette: { primary: '#123', secondary: '#456789', accent: '#789abc', page: '#def' }, layout: { header: 'rail' } })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) {
      const joined = invalid.errors.join(' ')
      expect(joined).toMatch(/palette\.primary/)
      expect(joined).toMatch(/layout\.header/)
    }
  })

  it('migrates version 1 and fails closed on unknown versions', () => {
    expect(civic.config.migrate(1, civic.config.defaults).ok).toBe(true)
    expect(civic.config.migrate(9, civic.config.defaults).ok).toBe(false)
  })

  it('adapts legacy scalars into Civic vocabulary', () => {
    const config = civic.config.fromLegacy!({
      designTemplate: 'civic',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      backgroundColor: '#444444',
      headingFontKey: 'georgia',
      bodyFontKey: 'verdana',
      headerLayout: 'banner-forward',
      documentStyle: 'modern',
      contentWidth: 'wide',
    })
    expect(config.palette.primary).toBe('#111111')
    expect(config.layout.header).toBe('banner')
    expect(config.document.treatment).toBe('modern')
    expect(config.layout.width).toBe('wide')
  })

  it('resolves the universal bridge plus --civic-* namespaced vars', () => {
    const theme = serializeDesignTheme(civic.config.resolveTheme(civic.config.defaults))
    expect(theme['--tenant-primary']).toBe(civic.config.defaults.palette.primary)
    expect(theme['--tenant-page-bg']).toBe(civic.config.defaults.palette.page)
    expect(theme['--civic-header']).toBe('centered')
    expect(theme['--civic-document']).toBe('classic')
  })
})

describe('Ledger config v1', () => {
  it('validates a complete config and rejects Civic vocabulary', () => {
    const result = ledger.config.validate(ledger.config.defaults)
    expect(result.ok).toBe(true)
    // A Civic-shaped object is NOT a valid Ledger config — no shared validator.
    const civicShaped = ledger.config.validate({ palette: { primary: '#111111', secondary: '#222222', accent: '#333333', page: '#444444' } })
    expect(civicShaped.ok).toBe(false)
    if (!civicShaped.ok) expect(civicShaped.errors.join(' ')).toMatch(/palette\.ink/)
  })

  it('speaks rail/rules/register — never headerLayout', () => {
    const defaults = ledger.config.defaults
    expect(defaults.rail.width).toBe('standard')
    expect(defaults.rail.density).toBe('standard')
    expect(defaults.rules.strength).toBe('standard')
    expect(defaults.document.treatment).toBe('register')
    expect(Object.keys(defaults)).not.toContain('headerLayout')
  })

  it('adapts legacy scalars and resolves --ledger-* vars', () => {
    const config = ledger.config.fromLegacy!({
      primaryColor: '#173F58',
      secondaryColor: '#315D76',
      accentColor: '#BD5638',
      backgroundColor: '#F5F1E9',
      headingFontKey: 'newsreader',
      bodyFontKey: 'lato',
      documentStyle: 'modern',
    })
    expect(config.palette.ink).toBe('#173F58')
    expect(config.document.treatment).toBe('docket')
    const theme = serializeDesignTheme(ledger.config.resolveTheme(config))
    expect(theme['--ledger-rail-width']).toBe('standard')
    expect(theme['--ledger-document']).toBe('docket')
    expect(theme['--tenant-primary']).toBe('#173F58')
  })
})

describe('Poster config v1 (compatibility)', () => {
  it('validates its own small vocabulary', () => {
    expect(poster.config.validate(poster.config.defaults).ok).toBe(true)
    expect(poster.config.validate({ palette: { primary: 'nope', accent: '#112233', page: '#445566' } }).ok).toBe(false)
  })
})

describe('design catalog purity', () => {
  it('exposes exactly the registered keys with basic metadata', () => {
    const root = path.join(process.cwd(), 'src/designs')
    const keys = readdirSync(root).filter(key => existsSync(path.join(root, key, 'design.manifest.json')))
    expect([...DESIGN_CATALOG_KEYS].sort()).toEqual(keys.sort())
  })

  it('the catalog module imports no React/Design bundles (payload-safe)', () => {
    const catalog = readFileSync(path.join(process.cwd(), 'src/lib/design/catalog.ts'), 'utf8')
    expect(catalog).not.toMatch(/from ['"]react['"]/)
    expect(catalog).not.toMatch(/@\/designs\//)
    expect(catalog).not.toMatch(/\.tsx/)
  })

  it('catalog status: Civic, Ledger, and Obsidian are first-class; Poster stays compatibility', () => {
    for (const entry of DESIGN_CATALOG) {
      const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'src/designs', entry.key, 'design.manifest.json'), 'utf8'))
      expect(entry.status).toBe(manifest.status)
    }
    expect(DESIGN_CATALOG.find(entry => entry.key === 'poster')?.status).toBe('compatibility')
  })
})

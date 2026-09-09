import { describe, expect, it } from 'vitest'

import { resolveDomainDesign } from '@/lib/design/resolveDomainDesign'
import { buildV2Envelope, mergeDesignBanks, parseV2Envelope, validateSubmittedBanks } from '@/lib/design/v2'
import { DESIGNS } from '@/lib/design/registry'
import type { LegacyDomainAppearance } from '@/lib/design/contracts'
import type { AtelierConfigV1 } from '@/designs/atelier/config'
import type { ObsidianConfigV1 } from '@/designs/obsidian/config'

const LEGACY_SCALARS = {
  designTemplate: 'civic',
  headerLayout: 'centered',
  documentStyle: 'classic',
  primaryColor: '#123456',
  secondaryColor: '#234567',
  accentColor: '#345678',
  backgroundColor: '#456789',
  headingFontKey: 'georgia',
  bodyFontKey: 'verdana',
  contentWidth: 'wide',
} as const

const ATELIER_MUTATED_BANK = {
  version: 1,
  config: { ...(DESIGNS.atelier.config.defaults as AtelierConfigV1), accent: '#1f6f54', density: 'compact' as const },
} as const

describe('P08D-T04 JSON authority', () => {
  it('V2 bank wins over legacy scalars everywhere', () => {
    const v2 = buildV2Envelope('atelier', { atelier: ATELIER_MUTATED_BANK })
    const resolved = resolveDomainDesign({ ...LEGACY_SCALARS, designConfig: v2 })
    expect(resolved.design.key).toBe('atelier')
    const config = resolved.config as AtelierConfigV1
    expect(config.accent).toBe('#1f6f54')
    // The namespaced vars carry the resolved vocabulary.
    expect(resolved.cssVars['--atelier-accent']).toBe('#1f6f54')
    expect(resolved.cssVars['--atelier-row']).toBe('12px')
  })

  it('unknown active key resolves to Civic defaults safely', () => {
    const v2 = buildV2Envelope('gazette', { gazette: { version: 1, config: {} } })
    const resolved = resolveDomainDesign({ designConfig: v2 })
    expect(resolved.design.key).toBe('civic')
  })
})

describe('P08D-T04 bank behavior', () => {
  it('missing bank produces the active Design defaults', () => {
    const v2 = buildV2Envelope('obsidian', {}) // no obsidian bank
    const resolved = resolveDomainDesign({ designConfig: v2 })
    expect(resolved.design.key).toBe('obsidian')
    expect(resolved.diagnostic).toBeNull()
    expect(resolved.config).toEqual(DESIGNS.obsidian.config.defaults)
  })

  it('invalid active bank falls back to Design defaults without executing raw values', () => {
    const v2 = buildV2Envelope('civic', { civic: { version: 1, config: { palette: { primary: 'not-a-color' } } } })
    const resolved = resolveDomainDesign({ designConfig: v2 })
    expect(resolved.design.key).toBe('civic')
    expect(resolved.config).toEqual(DESIGNS.civic.config.defaults)
    // Migration for v1 IS validation, so the diagnostic may name either.
    expect(resolved.diagnostic).toMatch(/migrat|valid/)
  })

  it('unsupported bank version fails migration and falls back to defaults', () => {
    const v2 = buildV2Envelope('civic', { civic: { version: 99, config: { palette: { primary: '#111111' } } } })
    const resolved = resolveDomainDesign({ designConfig: v2 })
    expect(resolved.design.key).toBe('civic')
    expect(resolved.config).toEqual(DESIGNS.civic.config.defaults)
    expect(resolved.diagnostic).toMatch(/migration/)
  })

  it('T19 switching restores distinct Civic, Obsidian, and Atelier banks', () => {
    const civicBank = { version: 1, config: DESIGNS.civic.config.defaults }
    const atelierBank = ATELIER_MUTATED_BANK
    const obsidianDefaults = DESIGNS.obsidian.config.defaults as ObsidianConfigV1
    const obsidianBank = {
      version: 1,
      config: {
        ...obsidianDefaults,
        palette: { ...obsidianDefaults.palette, accent: '#f2c879' },
        records: { ...obsidianDefaults.records, defaultView: 'list' as const, listPageSize: 100 as const },
      },
    }
    let stored = buildV2Envelope('civic', { civic: civicBank, atelier: atelierBank, obsidian: obsidianBank })
    for (const activeDesign of ['obsidian', 'atelier', 'obsidian', 'civic']) {
      stored = mergeDesignBanks(parseV2Envelope(stored), {}, activeDesign)
      const resolved = resolveDomainDesign({ designConfig: stored })
      expect(resolved.design.key).toBe(activeDesign)
      if (activeDesign === 'obsidian') {
        expect((resolved.config as typeof obsidianBank.config).palette.accent).toBe('#f2c879')
        expect((resolved.config as typeof obsidianBank.config).records.defaultView).toBe('list')
      }
    }
    expect(stored.settingsByDesign.civic).toEqual(civicBank)
    expect(stored.settingsByDesign.atelier).toEqual(atelierBank)
    expect(stored.settingsByDesign.obsidian).toEqual(obsidianBank)
  })
})

describe('P08D-T04 V1/legacy fallback', () => {
  it('adapts V1 structured config through the Design fromLegacy', () => {
    const v1 = {
      schemaVersion: 1,
      designKey: 'civic',
      common: {
        primaryColor: '#abcdef',
        secondaryColor: '#111111',
        accentColor: '#222222',
        backgroundColor: '#333333',
        headingFontKey: 'georgia',
        bodyFontKey: 'verdana',
      },
      options: { headerLayout: 'banner-forward', documentStyle: 'modern' },
      design: {},
    }
    const resolved = resolveDomainDesign({ ...LEGACY_SCALARS, designConfig: v1 })
    expect(resolved.design.key).toBe('civic')
    const config = resolved.config as { layout: { header: string }; document: { treatment: string } }
    expect(config.layout.header).toBe('banner')
    expect(config.document.treatment).toBe('modern')
    expect(resolved.variant.headerLayout).toBe('banner-forward')
    expect(resolved.variant.documentStyle).toBe('modern')
  })

  it('falls back to legacy scalars when no JSON is present', () => {
    const resolved = resolveDomainDesign(LEGACY_SCALARS)
    expect(resolved.design.key).toBe('civic')
    expect(resolved.diagnostic).toBeNull()
  })
})

describe('P08D-T04 bank merge and validation (save contract)', () => {
  it('saving Civic preserves the Obsidian bank and unknown banks', () => {
    const stored = buildV2Envelope('obsidian', {
      obsidian: { version: 1, config: (DESIGNS.obsidian.config.defaults as ObsidianConfigV1) },
      future_design: { version: 1, config: { anything: 'preserved' } },
    })
    const merged = mergeDesignBanks(parseV2Envelope(stored), { civic: { version: 1, config: DESIGNS.civic.config.defaults } }, 'civic')
    expect(merged.activeDesign).toBe('civic')
    expect(merged.settingsByDesign.obsidian).toBeDefined()
    expect(merged.settingsByDesign.future_design).toEqual({ version: 1, config: { anything: 'preserved' } })
    expect(merged.settingsByDesign.civic.config).toEqual(DESIGNS.civic.config.defaults)
  })

  it('saving Civic alone never deletes another Design bank (G7)', () => {
    const stored = buildV2Envelope('obsidian', { obsidian: { version: 1, config: (DESIGNS.obsidian.config.defaults as ObsidianConfigV1) } })
    const merged = mergeDesignBanks(parseV2Envelope(stored), { civic: { version: 1, config: DESIGNS.civic.config.defaults } }, 'civic')
    const serialized = JSON.stringify(merged.settingsByDesign.obsidian)
    expect(serialized).toBe(JSON.stringify({ version: 1, config: DESIGNS.obsidian.config.defaults }))
  })

  it('validateSubmittedBanks rejects unknown keys and validates known banks', () => {
    const known = validateSubmittedBanks(
      { civic: { version: 1, config: DESIGNS.civic.config.defaults }, mystery: { version: 1, config: {} } },
      DESIGNS,
    )
    expect(known.ok).toBe(false)
    if (!known.ok) expect(known.errors.join(' ')).toMatch(/mystery/)

    const bad = validateSubmittedBanks({ civic: { version: 1, config: { palette: { primary: 'x' } } } }, DESIGNS)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors.join(' ')).toMatch(/civic/)
  })
})

describe('P08D-T04 envelope parsing', () => {
  it('rejects malformed envelopes', () => {
    expect(parseV2Envelope(null)).toBeNull()
    expect(parseV2Envelope({ schemaVersion: 1 })).toBeNull()
    expect(parseV2Envelope({ schemaVersion: 2 })).toBeNull() // no activeDesign/settings
    expect(parseV2Envelope({ schemaVersion: 2, activeDesign: 'civic', settingsByDesign: { civic: { version: 'x', config: {} } } })).toBeNull()
    expect(parseV2Envelope({ schemaVersion: 2, activeDesign: '', settingsByDesign: {} })).toBeNull()
  })

  it('unknown stored banks are preserved by the parser', () => {
    const envelope = buildV2Envelope('civic', { civic: { version: 1, config: {} }, future_x: { version: 1, config: { keep: true } } })
    const parsed = parseV2Envelope(envelope)
    expect(parsed).not.toBeNull()
    expect(parsed?.settingsByDesign.future_x).toEqual({ version: 1, config: { keep: true } })
  })
})

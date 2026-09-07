import { describe, expect, it } from 'vitest'

import { resolveDomainDesign } from '@/lib/design/resolveDomainDesign'
import { buildV2Envelope, mergeDesignBanks, parseV2Envelope, validateSubmittedBanks } from '@/lib/design/v2'
import { DESIGNS } from '@/lib/design/registry'
import type { LegacyDomainAppearance } from '@/lib/design/contracts'

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

const LEDGER_REGISTER_CONFIG = {
  version: 1,
  config: {
    palette: { ink: '#111111', secondaryInk: '#222222', accent: '#333333', paper: '#F5F1E9' },
    typography: { displayFontKey: 'newsreader', bodyFontKey: 'lato' },
    rail: { width: 'wide', density: 'compact' },
    masthead: { treatment: 'folio', image: null },
    rules: { strength: 'heavy' },
    document: { treatment: 'register' },
    paperTexture: null,
  },
} as const

describe('P08D-T04 JSON authority', () => {
  it('V2 says Ledger/register and legacy says Civic/classic — V2 wins everywhere', () => {
    const v2 = buildV2Envelope('ledger', { ledger: LEDGER_REGISTER_CONFIG })
    const resolved = resolveDomainDesign({ ...LEGACY_SCALARS, designConfig: v2 })
    expect(resolved.design.key).toBe('ledger')
    const config = resolved.config as { document: { treatment: string } }
    expect(config.document.treatment).toBe('register')
    // The legacy axes are DERIVED from the resolved config (G8): register→classic.
    expect(resolved.variant.documentStyle).toBe('classic')
    // Ledger-namespaced vars carry the resolved vocabulary.
    expect(resolved.cssVars['--ledger-document']).toBe('register')
    expect(resolved.cssVars['--ledger-rail-width']).toBe('wide')
    // The universal bridge reflects the Ledger ink/paper palette.
    expect(resolved.cssVars['--tenant-primary']).toBe('#111111')
    expect(resolved.cssVars['--tenant-page-bg']).toBe('#F5F1E9')
  })

  it('unknown active key resolves to Civic defaults safely', () => {
    const v2 = buildV2Envelope('obsidian', { obsidian: { version: 1, config: {} } })
    const resolved = resolveDomainDesign({ designConfig: v2 })
    expect(resolved.design.key).toBe('civic')
  })
})

describe('P08D-T04 bank behavior', () => {
  it('missing bank produces the active Design defaults', () => {
    const v2 = buildV2Envelope('ledger', {}) // no ledger bank
    const resolved = resolveDomainDesign({ designConfig: v2 })
    expect(resolved.design.key).toBe('ledger')
    expect(resolved.diagnostic).toBeNull()
    expect(resolved.config).toEqual(DESIGNS.ledger.config.defaults)
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
  it('saving Civic preserves the Ledger bank and unknown banks', () => {
    const stored = buildV2Envelope('ledger', {
      ledger: LEDGER_REGISTER_CONFIG,
      future_design: { version: 1, config: { anything: 'preserved' } },
    })
    const merged = mergeDesignBanks(parseV2Envelope(stored), { civic: { version: 1, config: DESIGNS.civic.config.defaults } }, 'civic')
    expect(merged.activeDesign).toBe('civic')
    expect(merged.settingsByDesign.ledger).toEqual(LEDGER_REGISTER_CONFIG)
    expect(merged.settingsByDesign.future_design).toEqual({ version: 1, config: { anything: 'preserved' } })
    expect(merged.settingsByDesign.civic.config).toEqual(DESIGNS.civic.config.defaults)
  })

  it('saving Civic alone never deletes the Ledger bank (G7)', () => {
    const stored = buildV2Envelope('ledger', { ledger: LEDGER_REGISTER_CONFIG })
    const merged = mergeDesignBanks(parseV2Envelope(stored), { civic: { version: 1, config: DESIGNS.civic.config.defaults } }, 'civic')
    const serialized = JSON.stringify(merged.settingsByDesign.ledger)
    expect(serialized).toBe(JSON.stringify(LEDGER_REGISTER_CONFIG))
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
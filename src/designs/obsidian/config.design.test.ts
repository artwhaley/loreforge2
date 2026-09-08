import { describe, expect, it } from 'vitest'

import { obsidian } from './index'
import { obsidianDefaults, validateObsidianConfig } from './config'

describe('Obsidian config v1', () => {
  it('validates its own bounded vocabulary', () => {
    expect(validateObsidianConfig(obsidianDefaults).ok).toBe(true)
    expect(validateObsidianConfig({ ...obsidianDefaults, geometry: { ...obsidianDefaults.geometry, contentMax: 719 } }).ok).toBe(false)
    expect(validateObsidianConfig({ ...obsidianDefaults, records: { ...obsidianDefaults.records, defaultView: 'table' } }).ok).toBe(false)
    expect(validateObsidianConfig({ ...obsidianDefaults, unknown: true }).ok).toBe(false)
  })

  it('accepts only local Design asset references', () => {
    expect(validateObsidianConfig({ ...obsidianDefaults, atmosphere: { url: '/media/harbour.webp' } }).ok).toBe(true)
    expect(validateObsidianConfig({ ...obsidianDefaults, atmosphere: { url: 'https://example.test/harbour.webp' } }).ok).toBe(false)
  })

  it('round-trips v1 and resolves the universal plus namespaced theme bridge', () => {
    expect(obsidian.config.migrate(1, obsidianDefaults).ok).toBe(true)
    expect(obsidian.config.migrate(9, obsidianDefaults).ok).toBe(false)
    const theme = obsidian.config.resolveTheme(obsidianDefaults)
    expect(theme.base.pageBg).toBe(obsidianDefaults.palette.background)
    expect(theme.vars?.['--obsidian-max']).toBe('1440px')
    expect(theme.vars?.['--obsidian-atmosphere']).toBe('/media/obsidian-coastline.png')
  })
})

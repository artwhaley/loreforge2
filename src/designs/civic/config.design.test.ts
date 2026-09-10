import { describe, expect, it } from 'vitest'

import { civic } from './index'
import { civicDefaults, civicLooks, validateCivicConfig } from './config'

describe('Civic config v2', () => {
  it.each(Object.entries(civicLooks))('resolves the complete %s look', (_key, look) => {
    const { name: _name, ...palette } = look
    const config = { ...civicDefaults, palette }
    expect(validateCivicConfig(config).ok).toBe(true)
    expect(civic.config.migrate(2, config).ok).toBe(true)
    const theme = civic.config.resolveTheme(config)
    expect(theme.base.pageBg).toBe(palette.page)
    expect(theme.vars?.['--civic-masthead']).toBe(palette.masthead)
  })
  it('validates its own bounded vocabulary', () => {
    expect(validateCivicConfig(civicDefaults).ok).toBe(true)
    expect(validateCivicConfig({ ...civicDefaults, layout: { ...civicDefaults.layout, header: 'rail' } }).ok).toBe(false)
    expect(validateCivicConfig({ ...civicDefaults, document: { ...civicDefaults.document, treatment: 'docket' } }).ok).toBe(false)
    expect(validateCivicConfig({ ...civicDefaults, palette: { ...civicDefaults.palette, primary: '#24314' } }).ok).toBe(false)
  })

  it('accepts only local Design asset references', () => {
    expect(validateCivicConfig({ ...civicDefaults, background: { treatment: 'washes', image: { url: '/media/mural.webp' } } }).ok).toBe(true)
    expect(validateCivicConfig({ ...civicDefaults, background: { treatment: 'washes', image: { url: '/design-assets/civic/assets/paper.png' } } }).ok).toBe(true)
    expect(validateCivicConfig({ ...civicDefaults, background: { treatment: 'washes', image: { url: '/design-assets/atelier/thumbnail.svg' } } }).ok).toBe(false)
    expect(validateCivicConfig({ ...civicDefaults, banner: { image: { url: 'https://example.test/banner.webp' } } }).ok).toBe(false)
  })

  it('round-trips v1 and resolves the universal plus namespaced theme bridge', () => {
    expect(civic.config.migrate(1, civicDefaults).ok).toBe(true)
    expect(civic.config.migrate(9, civicDefaults).ok).toBe(false)
    const theme = civic.config.resolveTheme(civicDefaults)
    expect(theme.base.pageBg).toBe(civicDefaults.palette.page)
    expect(theme.vars?.['--civic-header']).toBe('centered')
    expect(theme.vars?.['--civic-document']).toBe('classic')
  })
})

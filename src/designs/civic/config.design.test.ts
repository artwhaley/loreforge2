import { describe, expect, it } from 'vitest'

import { civic } from './index'
import { civicDefaults, validateCivicConfig } from './config'

describe('Civic config v1', () => {
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

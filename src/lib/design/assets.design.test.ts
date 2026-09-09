import { describe, expect, it } from 'vitest'

import { bundledDesignAssetUrl, isDesignAssetRefForKey, isSanctionedDesignAssetUrl } from './assets'
import { isDesignAssetRef } from './validate'

describe('bundled Design asset contract', () => {
  it('resolves a local bundled asset URL without allowing path escape', () => {
    expect(bundledDesignAssetUrl('obsidian', 'assets/atmosphere.png')).toBe('/design-assets/obsidian/atmosphere.png')
    expect(() => bundledDesignAssetUrl('obsidian', '../secret.png')).toThrow()
    expect(() => bundledDesignAssetUrl('obsidian', '/secret.png')).toThrow()
  })

  it('accepts media overrides and same-Design bundled refs only', () => {
    expect(isSanctionedDesignAssetUrl('/media/upload.webp')).toBe(true)
    expect(isSanctionedDesignAssetUrl('/design-assets/obsidian/assets/atmosphere.png')).toBe(true)
    expect(isSanctionedDesignAssetUrl('/design-assets/atelier/assets/thumbnail.svg', 'obsidian')).toBe(false)
    expect(isSanctionedDesignAssetUrl('https://example.test/image.png')).toBe(false)
    expect(isDesignAssetRef({ url: '/design-assets/obsidian/assets/atmosphere.png' })).toBe(true)
    expect(isDesignAssetRefForKey({ url: '/design-assets/obsidian/assets/atmosphere.png' }, 'obsidian')).toBe(true)
    expect(isDesignAssetRefForKey({ url: '/design-assets/atelier/assets/thumbnail.svg' }, 'obsidian')).toBe(false)
  })
})

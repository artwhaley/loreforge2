import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { DESIGN_CATALOG, DESIGN_CATALOG_KEYS } from '@/lib/design/catalog'

/**
 * Design catalog purity: the catalog mirrors the discovered Design folders and
 * stays payload-safe. Each Design's own config vocabulary is validated by ITS
 * validator inside the Design folder (`src/designs/<key>/config.design.test.ts`)
 * — this suite intentionally knows no Design-specific vocabulary.
 */
describe('design catalog purity', () => {
  it('exposes exactly the registered keys with basic metadata', () => {
    const root = path.join(process.cwd(), 'src/designs')
    const keys = readdirSync(root).filter(key => existsSync(path.join(root, key, 'design.manifest.json')))
    expect([...DESIGN_CATALOG_KEYS].sort()).toEqual(keys.sort())
  })

  it('the catalog module imports no React/Design bundles (payload-safe)', () => {
    const catalog = readFileSync(path.join(process.cwd(), 'src/lib/design/catalog.ts'), 'utf8')
    expect(catalog).not.toMatch(/from .react./)
    expect(catalog).not.toMatch(/@\/designs\//)
    expect(catalog).not.toMatch(/\.tsx/)
  })

  it('catalog status matches each Design manifest', () => {
    for (const entry of DESIGN_CATALOG) {
      const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'src/designs', entry.key, 'design.manifest.json'), 'utf8'))
      expect(entry.status).toBe(manifest.status)
    }
  })
})

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseDesignManifest, readDesignManifest } from './manifest'

const valid = {
  manifestVersion: 1,
  designContractVersion: 1,
  key: 'harbour-veil',
  name: 'Harbour Veil',
  status: 'first-class',
  description: 'A test Design.',
  entry: './index.ts',
  preview: { thumbnail: 'assets/thumbnail.svg' },
} as const

describe('Design manifest contract', () => {
  it('accepts a valid pure-data manifest and checks its folder identity', () => {
    expect(parseDesignManifest(valid, { folderName: 'harbour-veil' })).toEqual(valid)
  })

  it.each([
    ['unsupported manifest version', { ...valid, manifestVersion: 2 }],
    ['unsupported contract version', { ...valid, designContractVersion: 2 }],
    ['invalid key', { ...valid, key: '../harbour-veil' }],
    ['mismatched folder', { ...valid, key: 'other' }],
    ['wrong entry', { ...valid, entry: './source/index.ts' }],
    ['thumbnail traversal', { ...valid, preview: { thumbnail: '../thumbnail.svg' } }],
  ])('%s is rejected', (_label, candidate) => {
    expect(() => parseDesignManifest(candidate, { folderName: 'harbour-veil' })).toThrow()
  })

  it('requires manifest-referenced files when reading from a Design folder', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'loreforge-design-'))
    mkdirSync(path.join(root, 'assets'))
    writeFileSync(path.join(root, 'index.ts'), 'export default {}\n')
    writeFileSync(path.join(root, 'assets', 'thumbnail.svg'), '<svg />\n')
    const manifestPath = path.join(root, 'design.manifest.json')
    writeFileSync(manifestPath, JSON.stringify(valid))

    expect(readDesignManifest(manifestPath, { folderName: 'harbour-veil' })).toEqual(valid)
    writeFileSync(manifestPath, JSON.stringify({ ...valid, preview: { thumbnail: 'assets/missing.svg' } }))
    expect(() => readDesignManifest(manifestPath, { folderName: 'harbour-veil' })).toThrow(/does not exist/)
  })
})

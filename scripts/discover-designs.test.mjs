import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { discoverDesigns } from './discover-designs.mjs'

test('discovery generates deterministic keys and detects stale output', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'loreforge-discovery-'))
  try {
    const designRoot = path.join(root, 'designs')
    const outputRoot = path.join(root, 'generated')
    const publicRoot = path.join(root, 'public')
    const probeRoot = path.join(designRoot, 'probe')
    mkdirSync(path.join(probeRoot, 'assets'), { recursive: true })
    writeFileSync(path.join(probeRoot, 'index.ts'), 'export default {}\n')
    writeFileSync(path.join(probeRoot, 'assets', 'thumbnail.svg'), '<svg />\n')
    writeFileSync(path.join(probeRoot, 'design.manifest.json'), JSON.stringify({
      manifestVersion: 1,
      designContractVersion: 1,
      key: 'probe',
      name: 'Probe',
      status: 'first-class',
      description: 'Probe',
      entry: './index.ts',
      preview: { thumbnail: 'assets/thumbnail.svg' },
    }))

    const outputFile = path.join(outputRoot, 'designKeys.ts')
    const result = discoverDesigns({ designRoot, outputFile, publicRoot })
    assert.deepEqual(result.keys, ['probe'])
    discoverDesigns({ designRoot, outputFile, publicRoot, check: true })
    const secondRoot = path.join(designRoot, 'second')
    mkdirSync(path.join(secondRoot, 'assets'), { recursive: true })
    writeFileSync(path.join(secondRoot, 'index.ts'), 'export default {}\n')
    writeFileSync(path.join(secondRoot, 'assets', 'thumbnail.svg'), '<svg />\n')
    writeFileSync(path.join(secondRoot, 'design.manifest.json'), JSON.stringify({
      manifestVersion: 1,
      designContractVersion: 1,
      key: 'second',
      name: 'Second',
      status: 'compatibility',
      description: 'Second',
      entry: './index.ts',
      preview: { thumbnail: 'assets/thumbnail.svg' },
    }))
    assert.throws(() => discoverDesigns({ designRoot, outputFile, publicRoot, check: true }), /stale/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

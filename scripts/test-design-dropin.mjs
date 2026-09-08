import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = path.join(repoRoot, 'test-fixtures', 'designs', 'portability-probe')
const installed = path.join(repoRoot, 'src', 'designs', 'portability-probe')
const generatedRoot = path.join(repoRoot, 'src', 'lib', 'design', 'generated')
const generatedAssets = path.join(repoRoot, 'public', 'design-assets', 'portability-probe')
const includeBuild = process.argv.includes('--build')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function fail(message) {
  throw new Error(message)
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' && command.endsWith('.cmd') })
  if (result.error) throw result.error
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
}

function assertGeneratedContains(expected) {
  for (const name of ['designKeys.ts', 'catalog.ts', 'registry.ts']) {
    const source = fs.readFileSync(path.join(generatedRoot, name), 'utf8')
    if (!source.includes(expected)) fail(`${name} does not contain ${expected}`)
  }
  if (!fs.existsSync(path.join(generatedAssets, 'thumbnail.svg'))) fail('probe asset was not materialized')
}

function assertProbeRemoved() {
  for (const name of ['designKeys.ts', 'catalog.ts', 'registry.ts']) {
    const source = fs.readFileSync(path.join(generatedRoot, name), 'utf8')
    if (source.includes('portability-probe')) fail(`${name} still contains the removed probe`)
  }
  if (fs.existsSync(generatedAssets)) fail('probe asset output was not cleaned')
}

if (fs.existsSync(installed)) fail('portability probe is already installed')

let failure = null
try {
  fs.cpSync(fixture, installed, { recursive: true, errorOnExist: true })
  run(process.execPath, ['scripts/discover-designs.mjs'])
  assertGeneratedContains('portability-probe')
  run(npmCommand, ['exec', '--', 'tsc', '--noEmit'])
  if (includeBuild) run(npmCommand, ['run', 'build'])
} catch (error) {
  failure = error
} finally {
  fs.rmSync(installed, { recursive: true, force: true })
  try {
    run(process.execPath, ['scripts/discover-designs.mjs'])
    assertProbeRemoved()
  } catch (cleanupError) {
    failure ??= cleanupError
  }
}

if (failure) throw failure
console.log(`Design drop-in proof passed${includeBuild ? ' with a full production build' : ''}`)

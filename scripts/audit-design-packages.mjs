import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const designRoot = path.join(repoRoot, 'src', 'designs')
const defaultOutput = path.join(repoRoot, 'docs', 'design-portability', 'host-dependencies.json')

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
const outputPath = path.resolve(repoRoot, outputArg ? outputArg.slice('--output='.length) : defaultOutput)

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.module.css'])
const assetExtensions = /\.(?:png|svg|jpe?g|webp|gif|avif|woff2?|ttf|otf)(?:\?.*)?$/i
const importPattern = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g
const quotedPathPattern = /['"`]([^'"`\s]+)['"`]/g

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function isInside(parent, child) {
  const rel = path.relative(parent, child)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}

function filesUnder(root) {
  const result = []
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (sourceExtensions.has(path.extname(entry.name).toLowerCase()) || entry.name.endsWith('.module.css')) result.push(full)
    }
  }
  visit(root)
  return result.sort()
}

function packageDirs() {
  return fs.readdirSync(designRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
    .map((entry) => path.join(designRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'design.manifest.json')))
    .sort()
}

function readManifest(dir) {
  const manifestPath = path.join(dir, 'design.manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const errors = []
  if (manifest.key !== path.basename(dir)) errors.push(`manifest key does not match folder: ${relative(dir)}`)
  if (manifest.entry !== './index.ts') errors.push(`manifest entry must be ./index.ts: ${relative(manifestPath)}`)
  if (!fs.existsSync(path.join(dir, 'index.ts'))) errors.push(`manifest entry is missing: ${relative(dir)}/index.ts`)
  return { manifest, errors }
}

function collectPackageAudit(dir, installableKeys) {
  const { manifest, errors } = readManifest(dir)
  const key = path.basename(dir)
  const importsOutsideFolder = []
  const crossDesignImports = []
  const boundaryEscapes = []
  const genericHostImports = []
  const npmImports = []
  const staticApiEndpoints = []
  const assetRefsOutsideSanctionedNamespaces = []
  const testFilesExcluded = []

  for (const filePath of filesUnder(dir)) {
    const source = fs.readFileSync(filePath, 'utf8')
    const isTest = /(?:\.design|\.test|\.spec)\./.test(path.basename(filePath))
    if (isTest) {
      testFilesExcluded.push(relative(filePath))
      continue
    }
    const fileLabel = relative(filePath)
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1]
      if (specifier.startsWith('.')) {
        const target = path.resolve(path.dirname(filePath), specifier)
        if (isInside(dir, target)) continue
        if (isInside(path.join(designRoot, 'shared'), target)) {
          genericHostImports.push({ file: fileLabel, specifier, kind: 'shared-host-support' })
        } else if (isInside(designRoot, target)) {
          crossDesignImports.push({ file: fileLabel, specifier, target: relative(target) })
        } else {
          boundaryEscapes.push({ file: fileLabel, specifier, target: relative(target) })
        }
        continue
      }
      if (specifier.startsWith('@/designs/')) {
        const targetKey = specifier.slice('@/designs/'.length).split('/')[0]
        if (targetKey !== key && installableKeys.has(targetKey)) crossDesignImports.push({ file: fileLabel, specifier })
        else importsOutsideFolder.push({ file: fileLabel, specifier, kind: 'host-design-surface' })
      } else if (specifier.startsWith('@/')) {
        importsOutsideFolder.push({ file: fileLabel, specifier, kind: 'generic-host-import' })
      } else if (!specifier.startsWith('node:')) {
        npmImports.push({ file: fileLabel, specifier })
      }
    }

    for (const match of source.matchAll(quotedPathPattern)) {
      const value = match[1]
      if (value.startsWith('/api/')) staticApiEndpoints.push({ file: fileLabel, endpoint: value })
      if (value.startsWith('/') && assetExtensions.test(value)) {
        const sanctioned = value.startsWith('/media/') || value.startsWith(`/design-assets/${key}/`)
        if (!sanctioned) assetRefsOutsideSanctionedNamespaces.push({ file: fileLabel, value })
      }
    }
  }

  return {
    key,
    manifest: {
      manifestVersion: manifest.manifestVersion,
      designContractVersion: manifest.designContractVersion,
      entry: manifest.entry,
      status: manifest.status,
    },
    importsOutsideFolder,
    genericHostImports,
    npmImports,
    crossDesignImports,
    boundaryEscapes,
    assetRefsOutsideSanctionedNamespaces,
    staticApiEndpoints,
    testFilesExcluded,
    errors,
  }
}

const dirs = packageDirs()
const installableKeys = new Set(dirs.map((dir) => path.basename(dir)))
const packages = dirs.map((dir) => collectPackageAudit(dir, installableKeys))
const errors = packages.flatMap((entry) => [
  ...entry.errors,
  ...entry.crossDesignImports.map((item) => `${entry.key}: cross-Design import ${item.file} -> ${item.specifier}`),
  ...entry.boundaryEscapes.map((item) => `${entry.key}: folder boundary escape ${item.file} -> ${item.specifier}`),
  ...entry.assetRefsOutsideSanctionedNamespaces.map((item) => `${entry.key}: unsanctioned asset reference ${item.file} -> ${item.value}`),
])

const report = {
  schemaVersion: 1,
  sourceRoot: 'src/designs',
  sanctionedAssetNamespaces: ['/media/<stored-file>', '/design-assets/<key>/<relative-path>'],
  packages,
  errors,
}
const serialized = `${JSON.stringify(report, null, 2)}\n`

if (checkOnly) {
  if (!fs.existsSync(outputPath)) {
    console.error(`design boundary report is missing: ${relative(outputPath)}`)
    process.exit(1)
  }
  const existing = fs.readFileSync(outputPath, 'utf8')
  if (existing !== serialized) {
    console.error(`design boundary report is stale: ${relative(outputPath)}`)
    process.exit(1)
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, serialized)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`audited ${packages.length} Design packages; no boundary errors`)

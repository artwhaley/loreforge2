import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const MANIFEST_VERSION = 1
const DESIGN_CONTRACT_VERSION = 1
const KEY_PATTERN = /^[a-z][a-z0-9-]*$/
// Shared presentation primitives under src/designs are host support, not
// installable Design packages and therefore do not carry a manifest.
const NON_DESIGN_FOLDERS = new Set(['shared'])

function fail(message) {
  throw new Error(`[design discovery] ${message}`)
}

function parseArgs(argv) {
  const args = { check: false, designRoot: path.join(REPO_ROOT, 'src', 'designs'), outputFile: path.join(REPO_ROOT, 'src', 'lib', 'design', 'generated', 'designKeys.ts'), publicRoot: path.join(REPO_ROOT, 'public') }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--check') args.check = true
    else if (arg === '--design-root') args.designRoot = path.resolve(argv[++index] ?? fail('--design-root requires a path'))
    else if (arg === '--output-root') args.outputFile = path.join(path.resolve(argv[++index] ?? fail('--output-root requires a path')), 'designKeys.ts')
    else if (arg === '--output') args.outputFile = path.resolve(argv[++index] ?? fail('--output requires a path'))
    else if (arg === '--public-root') args.publicRoot = path.resolve(argv[++index] ?? fail('--public-root requires a path'))
    else fail(`unknown argument ${arg}`)
  }
  return args
}

function safeRelativePath(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:/.test(value) || value.includes('\\')) {
    fail(`${field} must be a relative forward-slash path inside the Design folder`)
  }
  const segments = value.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    fail(`${field} contains an empty, dot, or traversal path segment`)
  }
  return value
}

/**
 * Compile-time manifest construction: the DesignDefinition exported from the
 * folder's index.ts is the single source of truth for installable metadata.
 * A folder dropped in without a manifest is constructed automatically; an
 * existing manifest is validated and cross-checked against the definition.
 */
function extractDefinitionMetadata(indexSource, folderName) {
  const marker = indexSource.match(/export\s+const\s+[A-Za-z0-9_$]+\s*:\s*DesignDefinition[^=]*=\s*\{/)
  if (!marker || marker.index === undefined) {
    // No named `export const <name>: DesignDefinition` in the entry. That is
    // tolerated ONLY when a manifest already exists (the manifest carries the
    // installable metadata); automatic construction requires the const so the
    // definition can be read at compile time.
    return null
  }
  const start = marker.index + marker[0].length - 1
  let depth = 0
  let inString = null
  let escaped = false
  let end = -1
  for (let index = start; index < indexSource.length; index += 1) {
    const ch = indexSource[index]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue }
    if (ch === '{') depth += 1
    else if (ch === '}') { depth -= 1; if (depth === 0) { end = index; break } }
  }
  if (end === -1) fail(`${folderName}: cannot find the end of the exported DesignDefinition object`)
  const body = indexSource.slice(start + 1, end)
  const grab = (key) => {
    const match = body.match(new RegExp(`\\b${key}\\s*:\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`))
    return match ? match[2] : undefined
  }
  const thumbnailMatch = body.match(/preview\s*:\s*\{\s*thumbnail\s*:\s*(["'])((?:\\\\.|(?!\\1).)*)\1/)
  const thumbnail = thumbnailMatch ? thumbnailMatch[2] : undefined
  const metadata = { key: grab('key'), status: grab('status'), name: grab('name'), description: grab('description'), thumbnail }
  if (!metadata.key || !KEY_PATTERN.test(metadata.key)) fail(`${folderName}: DesignDefinition must declare a valid lowercase-hyphen key`)
  if (metadata.key !== folderName) fail(`${folderName}: DesignDefinition key ${metadata.key} does not match folder ${folderName}`)
  if (metadata.status !== 'first-class' && metadata.status !== 'compatibility') fail(`${folderName}: DesignDefinition has an invalid status`)
  if (!metadata.name || metadata.name.trim() === '') fail(`${folderName}: DesignDefinition name must be non-empty`)
  if (!metadata.description || metadata.description.trim() === '') fail(`${folderName}: DesignDefinition description must be non-empty`)
  const expectedUrl = `/design-assets/${folderName}/`
  if (!metadata.thumbnail || !metadata.thumbnail.startsWith(expectedUrl)) {
    fail(`${folderName}: DesignDefinition preview.thumbnail must use the generated URL ${expectedUrl}<relative-path>`)
  }
  metadata.thumbnail = `assets/${metadata.thumbnail.slice(expectedUrl.length)}`
  if (!metadata.thumbnail.endsWith('.svg') && !metadata.thumbnail.endsWith('.png')) fail(`${folderName}: preview.thumbnail must be a bundled svg/png asset`)
  return metadata
}

function constructedManifest(folderName, metadata, sortOrder) {
  return {
    manifestVersion: MANIFEST_VERSION,
    designContractVersion: DESIGN_CONTRACT_VERSION,
    key: folderName,
    ...(sortOrder === undefined ? {} : { sortOrder }),
    name: metadata.name,
    status: metadata.status,
    description: metadata.description,
    entry: './index.ts',
    preview: { thumbnail: metadata.thumbnail },
  }
}

function readManifest(designRoot, folderName) {
  const designDir = path.join(designRoot, folderName)
  const manifestPath = path.join(designDir, 'design.manifest.json')
  const indexPath = path.join(designDir, 'index.ts')
  if (!existsSync(indexPath)) fail(`${folderName} is missing index.ts (the Design entrypoint)`)
  const metadata = extractDefinitionMetadata(readFileSync(indexPath, 'utf8'), folderName)
  const designDirReal = realpathSync(designDir)
  const designRootReal = realpathSync(designRoot)
  if (path.dirname(designDirReal) !== designRootReal) fail(`${designDir} is a symlink escaping the Design root`)
  for (const relativePath of ['index.ts', ...(metadata ? [`assets/${metadata.thumbnail.slice('assets/'.length)}`] : [])]) {
    const resolved = path.resolve(designDirReal, relativePath)
    if (!resolved.startsWith(`${designDirReal}${path.sep}`)) fail(`${manifestPath} path escapes its Design folder`)
    if (!existsSync(resolved)) fail(`${manifestPath} references missing ${relativePath}`)
  }
  if (!existsSync(manifestPath)) {
    // Automatic compile-time manifest construction: a folder dropped in with
    // only its index.ts + assets gets its manifest derived from the definition.
    if (!metadata) {
      fail(`${folderName}: automatic manifest construction requires index.ts to export \`export const <name>: DesignDefinition<...> = { ... }\` (a manifest already exists and carries the metadata)`)
    }
    return { manifest: constructedManifest(folderName, metadata, undefined), constructed: true }
  }
  let raw
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail(`cannot parse ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(`${manifestPath} must contain a JSON object`)
  if (raw.manifestVersion !== MANIFEST_VERSION) fail(`${manifestPath} has unsupported manifestVersion`)
  if (raw.designContractVersion !== DESIGN_CONTRACT_VERSION) fail(`${manifestPath} has unsupported designContractVersion`)
  if (typeof raw.key !== 'string' || !KEY_PATTERN.test(raw.key)) fail(`${manifestPath} has an invalid key`)
  if (raw.key !== folderName) fail(`${manifestPath} key ${raw.key} does not match folder ${folderName}`)
  if (raw.sortOrder !== undefined && (!Number.isInteger(raw.sortOrder) || raw.sortOrder < 0 || raw.sortOrder > 100000)) fail(`${manifestPath} sortOrder must be an integer between 0 and 100000`)
  if (raw.status !== 'first-class' && raw.status !== 'compatibility') fail(`${manifestPath} has an invalid status`)
  if (typeof raw.name !== 'string' || raw.name.trim() === '') fail(`${manifestPath} name must be non-empty`)
  if (typeof raw.description !== 'string' || raw.description.trim() === '') fail(`${manifestPath} description must be non-empty`)
  if (raw.entry !== './index.ts') fail(`${manifestPath} entry must be exactly ./index.ts`)
  if (!raw.preview || typeof raw.preview !== 'object' || Array.isArray(raw.preview)) fail(`${manifestPath} preview must be an object`)
  const thumbnail = safeRelativePath(raw.preview.thumbnail, `${manifestPath} preview.thumbnail`)
  if (!thumbnail.startsWith('assets/')) fail(`${manifestPath} preview.thumbnail must point into the Design assets folder`)
  if (!existsSync(path.resolve(designDirReal, thumbnail))) fail(`${manifestPath} references missing ${thumbnail}`)
  // The DesignDefinition is the source of truth: every installable metadata
  // field must agree with it. Auto-heal drift in write mode; fail in --check.
  // When the entry does not export a named const, the manifest is authoritative.
  if (metadata) {
    const expected = constructedManifest(folderName, metadata, raw.sortOrder)
    const fieldMismatch = (field) => JSON.stringify(raw[field]) !== JSON.stringify(expected[field])
    const drifted = ['key', 'status', 'name', 'description', 'preview'].some(fieldMismatch)
    if (drifted) {
      if (process.argv.includes('--check')) fail(`${manifestPath} metadata disagrees with its DesignDefinition (run discovery to heal)`)
      console.warn(`[design discovery] ${manifestPath} drifted from its DesignDefinition; rewriting`)
      return { manifest: constructedManifest(folderName, metadata, raw.sortOrder), constructed: false, heal: true }
    }
  }
  return { manifest: { ...raw, entry: './index.ts' }, constructed: false }
}

function expectedSource(keys) {
  const values = keys.map((key) => `  '${key}',`).join('\n')
  return `// AUTO-GENERATED by scripts/discover-designs.mjs. Do not edit.\n\nexport const DESIGN_KEYS = [\n${values}\n] as const\n\nexport type DesignKey = (typeof DESIGN_KEYS)[number]\n\nexport function isDesignKey(value: unknown): value is DesignKey {\n  return typeof value === 'string' && (DESIGN_KEYS as readonly string[]).includes(value)\n}\n`
}

function expectedCatalog(manifests) {
  const rows = manifests.map((manifest) => `  {\n    key: ${JSON.stringify(manifest.key)},\n    status: ${JSON.stringify(manifest.status)},\n    name: ${JSON.stringify(manifest.name)},\n    description: ${JSON.stringify(manifest.description)},\n    thumbnail: ${JSON.stringify(`/design-assets/${manifest.key}/${manifest.preview.thumbnail.slice('assets/'.length)}`)},\n  },`).join('\n')
  const firstClass = manifests.filter((manifest) => manifest.status === 'first-class').map((manifest) => `  ${JSON.stringify(manifest.key)},`).join('\n')
  return `// AUTO-GENERATED by scripts/discover-designs.mjs. Do not edit.\n\nimport type { DesignKey } from '../types'\nimport type { DesignStatus } from '../contracts'\n\nexport type DesignCatalogEntry = {\n  key: DesignKey\n  status: DesignStatus\n  name: string\n  description: string\n  thumbnail: string\n}\n\nexport const DESIGN_CATALOG: readonly DesignCatalogEntry[] = [\n${rows}\n]\n\nexport const DESIGN_CATALOG_KEYS: readonly DesignKey[] = DESIGN_CATALOG.map((entry) => entry.key)\n\nexport const FIRST_CLASS_DESIGNS: readonly DesignKey[] = [\n${firstClass}\n]\n`
}

function expectedRegistry(manifests) {
  const imports = manifests.map((manifest, index) => `import design_${index} from '@/designs/${manifest.key}'`).join('\n')
  const entries = manifests.map((manifest, index) => `  ${JSON.stringify(manifest.key)}: eraseConfig(design_${index}),`).join('\n')
  return `// AUTO-GENERATED by scripts/discover-designs.mjs. Do not edit.\n\n${imports}\nimport type { DesignDefinition, DesignKey } from '../types'\nimport { isDesignKey } from './designKeys'\nimport { DESIGN_CATALOG, type DesignCatalogEntry } from './catalog'\nimport { DESIGN_KEYS as GENERATED_DESIGN_KEYS } from './designKeys'\n\nfunction eraseConfig<TConfig extends object>(definition: DesignDefinition<TConfig>): DesignDefinition {\n  return definition as unknown as DesignDefinition\n}\n\nexport const DESIGNS: Record<DesignKey, DesignDefinition> = {\n${entries}\n}\n\nexport const DESIGN_KEYS = GENERATED_DESIGN_KEYS\n\nexport function resolveDesign(key: unknown): DesignDefinition {\n  return isDesignKey(key) ? DESIGNS[key] : DESIGNS[GENERATED_DESIGN_KEYS[0]]\n}\n\nexport function getDesignDefinitions(): DesignDefinition[] {\n  return DESIGN_KEYS.map((key) => DESIGNS[key])\n}\n\nexport function getDesignDefinition(key: string): DesignDefinition | undefined {\n  return isDesignKey(key) ? DESIGNS[key] : undefined\n}\n\nexport const DESIGN_METADATA: DesignCatalogEntry[] = DESIGN_KEYS.map((key) => {\n  const entry = DESIGN_CATALOG.find((candidate) => candidate.key === key)\n  if (!entry) throw new Error(\`catalog missing metadata for \${key}\`)\n  return { ...entry }\n})\n`
}

function expectedRegistryGuard() {
  return [
    'for (const key of DESIGN_KEYS) {',
    '  const metadata = DESIGN_CATALOG.find((entry) => entry.key === key)',
    '  const definition = DESIGNS[key]',
    '  if (!metadata || definition.key !== metadata.key || definition.status !== metadata.status || definition.name !== metadata.name || definition.description !== metadata.description || definition.preview.thumbnail !== metadata.thumbnail) {',
    '    throw new Error("Design definition metadata disagrees with its manifest: " + key)',
    '  }',
    '}',
  ].join('\n')
}

function writeAtomically(filePath, contents) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  writeFileSync(temporaryPath, contents, 'utf8')
  if (existsSync(filePath)) rmSync(filePath, { force: true })
  renameSync(temporaryPath, filePath)
}

function listAssetFiles(root, relative = '') {
  if (!existsSync(root)) fail(`missing bundled asset directory: ${root}`)
  const stat = lstatSync(root)
  if (stat.isSymbolicLink()) fail(`bundled asset symlink is not allowed: ${root}`)
  if (!stat.isDirectory()) fail(`bundled asset root is not a directory: ${root}`)
  const result = []
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    const entryPath = path.join(root, entry.name)
    const entryRelative = relative ? `${relative}/${entry.name}` : entry.name
    const entryStat = lstatSync(entryPath)
    if (entryStat.isSymbolicLink()) fail(`bundled asset symlink is not allowed: ${entryPath}`)
    if (entry.isDirectory()) result.push(...listAssetFiles(entryPath, entryRelative))
    else if (entry.isFile()) result.push({ path: entryRelative, absolute: entryPath })
    else fail(`unsupported bundled asset filesystem entry: ${entryPath}`)
  }
  return result
}

function materializeDesignAssets({ designRoot, manifests, publicRoot, check }) {
  const targetRoot = path.resolve(publicRoot, 'design-assets')
  const expected = new Map()
  for (const manifest of manifests) {
    const sourceRoot = path.join(designRoot, manifest.key, 'assets')
    for (const asset of listAssetFiles(sourceRoot)) expected.set(`${manifest.key}/${asset.path}`, asset.absolute)
  }

  if (check) {
    if (!existsSync(targetRoot) || !lstatSync(targetRoot).isDirectory()) fail(`generated asset output is missing: ${targetRoot}`)
    const actual = new Map(listAssetFiles(targetRoot).map((asset) => [asset.path, asset.absolute]))
    if (actual.size !== expected.size || [...expected.keys()].some((key) => !actual.has(key) || !Buffer.from(readFileSync(expected.get(key))).equals(readFileSync(actual.get(key))))) {
      fail(`generated bundled assets are stale: ${targetRoot}`)
    }
    return { targetRoot, files: [...expected.keys()].sort() }
  }

  if (existsSync(targetRoot)) {
    const targetStat = lstatSync(targetRoot)
    if (targetStat.isSymbolicLink() || !targetStat.isDirectory()) fail(`generated asset output is not a directory: ${targetRoot}`)
    for (const entry of readdirSync(targetRoot, { withFileTypes: true })) {
      if (!manifests.some((manifest) => manifest.key === entry.name)) rmSync(path.join(targetRoot, entry.name), { recursive: true, force: true })
    }
  } else {
    mkdirSync(targetRoot, { recursive: true })
  }

  for (const manifest of manifests) {
    const targetDesignRoot = path.join(targetRoot, manifest.key)
    if (existsSync(targetDesignRoot)) rmSync(targetDesignRoot, { recursive: true, force: true })
    for (const asset of listAssetFiles(path.join(designRoot, manifest.key, 'assets'))) {
      const targetPath = path.join(targetDesignRoot, asset.path)
      mkdirSync(path.dirname(targetPath), { recursive: true })
      copyFileSync(asset.absolute, targetPath)
    }
  }
  return { targetRoot, files: [...expected.keys()].sort() }
}

export function discoverDesigns({ designRoot, outputFile, publicRoot, check = false } = {}) {
  const resolvedDesignRoot = path.resolve(designRoot ?? path.join(REPO_ROOT, 'src', 'designs'))
  const resolvedOutputFile = path.resolve(outputFile ?? path.join(REPO_ROOT, 'src', 'lib', 'design', 'generated', 'designKeys.ts'))
  if (!existsSync(resolvedDesignRoot) || !lstatSync(resolvedDesignRoot).isDirectory()) fail(`Design root does not exist: ${resolvedDesignRoot}`)
  const folders = readdirSync(resolvedDesignRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !NON_DESIGN_FOLDERS.has(entry.name)).map((entry) => entry.name).sort((left, right) => left.localeCompare(right, 'en'))
  // A directory under the Design root only becomes a Design when it contains
  // an entrypoint or a manifest. Scaffolds mid-creation (neither marker yet)
  // are skipped with a note instead of failing the whole tree.
  const designFolders = folders.filter((folderName) => {
    const dir = path.join(resolvedDesignRoot, folderName)
    const isDesign = existsSync(path.join(dir, 'index.ts')) || existsSync(path.join(dir, 'design.manifest.json'))
    if (!isDesign) console.warn(`[design discovery] skipping ${folderName}: not a Design (no index.ts and no design.manifest.json)`)
    return isDesign
  })
  const loaded = designFolders.map((folderName) => readManifest(resolvedDesignRoot, folderName))
  const manifests = loaded.map((entry) => entry.manifest).sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || left.key.localeCompare(right.key, 'en')
  })
  // Ordering is a presentation preference, not a globally allocated package ID.
  // Independently authored folders may share a priority; the key breaks ties.
  const keys = manifests.map((manifest) => manifest.key)
  if (new Set(keys).size !== keys.length) fail('duplicate Design keys discovered')
  const contents = {
    keys: expectedSource(keys),
    catalog: expectedCatalog(manifests),
    registry: `${expectedRegistry(manifests)}\n${expectedRegistryGuard()}\n`,
  }
  const outputRoot = path.dirname(resolvedOutputFile)
  const outputFiles = {
    keys: resolvedOutputFile,
    catalog: path.join(outputRoot, 'catalog.ts'),
    registry: path.join(outputRoot, 'registry.ts'),
  }
  if (check) {
    for (const name of Object.keys(outputFiles)) {
      const outputPath = outputFiles[name]
      if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== contents[name]) fail(`generated output is stale: ${outputPath}`)
    }
  } else {
    for (const name of Object.keys(outputFiles)) writeAtomically(outputFiles[name], contents[name])
    for (const entry of loaded) {
      if (entry.constructed || entry.heal) {
        const manifestPath = path.join(resolvedDesignRoot, entry.manifest.key, 'design.manifest.json')
        writeFileSync(manifestPath, `${JSON.stringify(entry.manifest, null, 2)}\n`, 'utf8')
      }
    }
  }
  const assets = materializeDesignAssets({ designRoot: resolvedDesignRoot, manifests, publicRoot: publicRoot ?? path.join(REPO_ROOT, 'public'), check })
  return { designRoot: resolvedDesignRoot, outputFile: resolvedOutputFile, outputFiles, keys, manifests, contents, assets, constructed: loaded.filter((entry) => entry.constructed).map((entry) => entry.manifest.key) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const result = discoverDesigns(args)
    console.log(`${args.check ? 'checked' : 'discovered'} ${result.keys.length} Designs: ${result.keys.join(', ')}${result.constructed.length ? ` (manifest constructed for ${result.constructed.join(', ')})` : ''}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

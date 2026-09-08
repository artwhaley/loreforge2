import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const DESIGN_MANIFEST_VERSION = 1 as const
export const DESIGN_CONTRACT_VERSION = 1 as const

export type DesignManifestV1 = {
  manifestVersion: 1
  designContractVersion: number
  key: string
  sortOrder?: number
  name: string
  status: 'first-class' | 'compatibility'
  description: string
  entry: './index.ts'
  preview: {
    thumbnail: string
  }
}

export type DesignManifestValidationOptions = {
  folderName?: string
  designDir?: string
  supportedContractVersion?: number
}

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`)
  }
  return value
}

/**
 * Manifest paths are data only. They are never resolved by importing or
 * executing a Design module, and they may not escape the Design folder.
 */
export function assertSafeManifestPath(value: unknown, field: string): string {
  const candidate = requireString(value, field)
  if (candidate.startsWith('/') || candidate.startsWith('\\') || /^[a-zA-Z]:/.test(candidate)) {
    throw new Error(`${field} must be a relative path inside the Design folder.`)
  }
  if (candidate.includes('\\')) {
    throw new Error(`${field} must use forward-slash path separators.`)
  }

  const segments = candidate.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`${field} must not contain empty, dot, or traversal path segments.`)
  }

  return candidate
}

export function parseDesignManifest(raw: unknown, options: DesignManifestValidationOptions = {}): DesignManifestV1 {
  if (!isRecord(raw)) throw new Error('Design manifest must be a JSON object.')
  if (raw.manifestVersion !== DESIGN_MANIFEST_VERSION) {
    throw new Error(`Unsupported design manifest version: ${String(raw.manifestVersion)}.`)
  }

  const supportedContractVersion = options.supportedContractVersion ?? DESIGN_CONTRACT_VERSION
  if (raw.designContractVersion !== supportedContractVersion) {
    throw new Error(`Unsupported Design contract version: ${String(raw.designContractVersion)}.`)
  }

  const key = requireString(raw.key, 'key')
  if (!KEY_PATTERN.test(key)) throw new Error(`key must match ${KEY_PATTERN}.`)
  if (options.folderName && key !== options.folderName) {
    throw new Error(`key ${key} does not match Design folder ${options.folderName}.`)
  }
  if (raw.sortOrder !== undefined && (typeof raw.sortOrder !== 'number' || !Number.isInteger(raw.sortOrder) || raw.sortOrder < 0 || raw.sortOrder > 100000)) {
    throw new Error('sortOrder must be an integer between 0 and 100000 when provided.')
  }

  const status = raw.status
  if (status !== 'first-class' && status !== 'compatibility') {
    throw new Error('status must be first-class or compatibility.')
  }

  const name = requireString(raw.name, 'name')
  const description = requireString(raw.description, 'description')
  if (name.length > 120) throw new Error('name must be at most 120 characters.')
  if (description.length > 1000) throw new Error('description must be at most 1000 characters.')

  const entry = raw.entry
  if (entry !== './index.ts') throw new Error('entry must be exactly ./index.ts.')
  assertSafeManifestPath(entry.slice(2), 'entry')

  if (!isRecord(raw.preview)) throw new Error('preview must be an object.')
  const thumbnail = assertSafeManifestPath(raw.preview.thumbnail, 'preview.thumbnail')
  if (!thumbnail.startsWith('assets/')) throw new Error('preview.thumbnail must point into the Design assets folder.')

  if (options.designDir) {
    const designDir = path.resolve(options.designDir)
    const entryPath = path.resolve(designDir, entry.slice(2))
    const thumbnailPath = path.resolve(designDir, thumbnail)
    if (!entryPath.startsWith(`${designDir}${path.sep}`) || !thumbnailPath.startsWith(`${designDir}${path.sep}`)) {
      throw new Error('Manifest path escapes the Design folder.')
    }
    if (!existsSync(entryPath)) throw new Error(`Manifest entry does not exist: ${entry}.`)
    if (!existsSync(thumbnailPath)) throw new Error(`Manifest thumbnail does not exist: ${thumbnail}.`)
  }

  return {
    manifestVersion: DESIGN_MANIFEST_VERSION,
    designContractVersion: supportedContractVersion,
    key,
    ...(raw.sortOrder === undefined ? {} : { sortOrder: raw.sortOrder }),
    name,
    status,
    description,
    entry: './index.ts',
    preview: { thumbnail },
  }
}

export function readDesignManifest(filePath: string, options: Omit<DesignManifestValidationOptions, 'designDir'> = {}): DesignManifestV1 {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read Design manifest ${filePath}: ${detail}`)
  }
  return parseDesignManifest(raw, { ...options, designDir: path.dirname(filePath) })
}

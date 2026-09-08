import type { DesignAssetRef } from './contracts'

const DESIGN_KEY_PATTERN = /^[a-z][a-z0-9-]*$/

function assertSafeRelativeAssetPath(relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || relativePath.startsWith('/') || relativePath.startsWith('\\') || relativePath.includes('\\')) {
    throw new Error('Bundled Design asset paths must be relative forward-slash paths.')
  }
  const segments = relativePath.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..' || segment.includes('?') || segment.includes('#'))) {
    throw new Error('Bundled Design asset paths must not contain traversal, empty, query, or hash segments.')
  }
  return relativePath
}

export function bundledDesignAssetUrl(designKey: string, relativePath: string): string {
  if (!DESIGN_KEY_PATTERN.test(designKey)) throw new Error(`Invalid Design key: ${designKey}`)
  const normalized = assertSafeRelativeAssetPath(relativePath).replace(/^assets\//, '')
  return `/design-assets/${designKey}/${normalized}`
}

export function isSanctionedDesignAssetUrl(value: unknown, designKey?: string): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.includes('..')) return false
  if (value.startsWith('/media/')) {
    return value.slice('/media/'.length).split('/').every((segment) => segment.length > 0 && segment !== '.' && !segment.includes('?') && !segment.includes('#'))
  }
  if (!value.startsWith('/design-assets/')) return false
  const remainder = value.slice('/design-assets/'.length)
  const segments = remainder.split('/')
  if (segments.length < 2 || !DESIGN_KEY_PATTERN.test(segments[0]) || !segments.slice(1).every((segment) => segment.length > 0 && segment !== '.' && !segment.includes('?') && !segment.includes('#'))) return false
  return designKey === undefined || segments[0] === designKey
}

export function isDesignAssetRefForKey(value: unknown, designKey?: string): value is DesignAssetRef {
  return typeof value === 'object' && value !== null && isSanctionedDesignAssetUrl((value as { url?: unknown }).url, designKey)
}

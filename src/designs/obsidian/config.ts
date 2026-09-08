// Obsidian config v1 (OBSIDIAN-T11). Obsidian's OWN vocabulary: night-harbour
// palette, bounded geometry, Records defaults, and one atmosphere asset.
// Ported from the incubation vocabulary; the preview-only image string became
// a persisted `DesignAssetRef | null`.
import type { CSSProperties } from 'react'

import { resolveFontStack } from '@/lib/theme/fonts'
import { readableTextColor } from '@/lib/theme/color'
import { bundledDesignAssetUrl } from '@/lib/design/assets'
import type { DesignAssetRef, LegacyDomainAppearance, ValidationResult } from '@/lib/design/contracts'
import { fail, isHexColor, isNullOrDesignAssetRef, ok } from '@/lib/design/validate'

export type ObsidianConfigV1 = {
  palette: {
    background: string
    surface: string
    text: string
    muted: string
    accent: string
  }
  geometry: {
    contentMax: number
    pageGutter: number
    surfaceRadius: number
  }
  records: {
    defaultView: 'cards' | 'list'
    cardPageSize: 6 | 12 | 24
    listPageSize: 25 | 50 | 100
  }
  atmosphere: DesignAssetRef | null
}

const VIEWS = ['cards', 'list'] as const
const CARD_PAGE_SIZES = [6, 12, 24] as const
const LIST_PAGE_SIZES = [25, 50, 100] as const

export type ObsidianConfig = ObsidianConfigV1

export const obsidianDefaults: ObsidianConfigV1 = {
  palette: {
    background: '#0b1419',
    surface: '#142128',
    text: '#edf2ef',
    muted: '#a7b7bc',
    accent: '#bce6d3',
  },
  geometry: { contentMax: 1440, pageGutter: 56, surfaceRadius: 18 },
  records: { defaultView: 'cards', cardPageSize: 6, listPageSize: 50 },
  // The incubator's original coastline/fortress artwork is part of Obsidian's
  // visual identity, not an optional content decoration.
  atmosphere: { url: bundledDesignAssetUrl('obsidian', 'assets/atmosphere.png') },
}

/** Compatibility name retained for the frozen incubation imports. */
export const OBSIDIAN_DEFAULTS = obsidianDefaults

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[], path: string, errors: string[]): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) errors.push(`${path}.${key} is not supported.`)
  }
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value) && value >= min && value <= max
}

export function validateObsidianConfig(raw: unknown): ValidationResult<ObsidianConfigV1> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(['Obsidian config must be an object.'])
  const value = raw as Record<string, unknown>
  const errors: string[] = []

  const palette = value.palette as Record<string, unknown> | undefined
  if (!palette || typeof palette !== 'object') errors.push('palette is required.')
  else {
    hasOnlyKeys(palette, ['background', 'surface', 'text', 'muted', 'accent'], 'palette', errors)
    for (const key of ['background', 'surface', 'text', 'muted', 'accent'] as const) {
      if (!isHexColor(palette[key])) errors.push(`palette.${key} must be a #rrggbb color.`)
    }
  }

  const geometry = value.geometry as Record<string, unknown> | undefined
  if (!geometry || typeof geometry !== 'object') errors.push('geometry is required.')
  else {
    hasOnlyKeys(geometry, ['contentMax', 'pageGutter', 'surfaceRadius'], 'geometry', errors)
    if (!isBoundedNumber(geometry.contentMax, 720, 2400)) errors.push('geometry.contentMax must be a number between 720 and 2400.')
    if (!isBoundedNumber(geometry.pageGutter, 0, 160)) errors.push('geometry.pageGutter must be a number between 0 and 160.')
    if (!isBoundedNumber(geometry.surfaceRadius, 0, 48)) errors.push('geometry.surfaceRadius must be a number between 0 and 48.')
  }

  const records = value.records as Record<string, unknown> | undefined
  if (!records || typeof records !== 'object') errors.push('records is required.')
  else {
    hasOnlyKeys(records, ['defaultView', 'cardPageSize', 'listPageSize'], 'records', errors)
    if (!VIEWS.includes(records.defaultView as never)) errors.push('records.defaultView must be cards|list.')
    if (!CARD_PAGE_SIZES.includes(records.cardPageSize as never)) errors.push('records.cardPageSize must be 6|12|24.')
    if (!LIST_PAGE_SIZES.includes(records.listPageSize as never)) errors.push('records.listPageSize must be 25|50|100.')
  }

  if (!isNullOrDesignAssetRef(value.atmosphere, 'obsidian')) errors.push('atmosphere must be null or a local asset reference.')
  else if (value.atmosphere && Object.keys(value.atmosphere as object).some((key) => key !== 'url')) errors.push('atmosphere contains an unsupported field.')
  hasOnlyKeys(value, ['palette', 'geometry', 'records', 'atmosphere'], 'config', errors)

  if (errors.length > 0) return fail(errors)
  return ok({
    palette: {
      background: (palette as Record<string, string>).background,
      surface: (palette as Record<string, string>).surface,
      text: (palette as Record<string, string>).text,
      muted: (palette as Record<string, string>).muted,
      accent: (palette as Record<string, string>).accent,
    },
    geometry: {
      contentMax: (geometry as { contentMax: number }).contentMax,
      pageGutter: (geometry as { pageGutter: number }).pageGutter,
      surfaceRadius: (geometry as { surfaceRadius: number }).surfaceRadius,
    },
    records: {
      defaultView: (records as { defaultView: ObsidianConfigV1['records']['defaultView'] }).defaultView,
      cardPageSize: (records as { cardPageSize: ObsidianConfigV1['records']['cardPageSize'] }).cardPageSize,
      listPageSize: (records as { listPageSize: ObsidianConfigV1['records']['listPageSize'] }).listPageSize,
    },
    atmosphere: (value.atmosphere as DesignAssetRef | null) ?? null,
  })
}

export function migrateObsidianConfig(fromVersion: number, raw: unknown): ValidationResult<ObsidianConfigV1> {
  // Only v1 exists; unknown versions fail closed to defaults by the caller.
  if (fromVersion !== 1) return fail([`Obsidian config version ${fromVersion} is not supported.`])
  return validateObsidianConfig(raw)
}

/**
 * A brand-new Design needs no legacy adaptation (INTEGRATION_NOTES); this
 * mapping exists only so a Domain that somehow carries legacy scalar fields
 * resolves to sensible Obsidian defaults rather than Civic's palette.
 */
export function obsidianFromLegacy(_legacy: LegacyDomainAppearance): ObsidianConfigV1 {
  return { ...obsidianDefaults }
}

/**
 * Universal base bridge plus `--obsidian-*` vars (G13: Design-specific
 * variables never join the --tenant-* set). The incubation's
 * `resolveObsidianTokens` names are preserved so the ported CSS keeps working.
 */
export function resolveObsidianTheme(config: ObsidianConfigV1): {
  base: { primary: string; secondary: string; accent: string; pageBg: string; surfaceBg: string; surfaceBorder: string; textOnPrimary: string; headingFont: string; bodyFont: string; mutedText: string }
  vars?: Record<string, string>
} {
  return {
    base: {
      primary: config.palette.accent,
      secondary: config.palette.surface,
      accent: config.palette.accent,
      pageBg: config.palette.background,
      surfaceBg: config.palette.surface,
      surfaceBorder: config.palette.accent,
      textOnPrimary: readableTextColor(config.palette.accent),
      headingFont: resolveFontStack('georgia'),
      bodyFont: resolveFontStack('verdana'),
      mutedText: config.palette.muted,
    },
    vars: {
      '--obsidian-bg': config.palette.background,
      '--obsidian-surface': config.palette.surface,
      '--obsidian-text': config.palette.text,
      '--obsidian-muted': config.palette.muted,
      '--obsidian-accent': config.palette.accent,
      '--obsidian-max': `${config.geometry.contentMax}px`,
      '--obsidian-gutter': `${config.geometry.pageGutter}px`,
      '--obsidian-radius': `${config.geometry.surfaceRadius}px`,
      '--obsidian-atmosphere': config.atmosphere?.url ?? 'none',
    },
  }
}

/** Local preview helper retained for the ported components' inline styles. */
export function resolveObsidianTokens(config: ObsidianConfigV1): CSSProperties {
  const { vars } = resolveObsidianTheme(config)
  return (vars ?? {}) as CSSProperties
}

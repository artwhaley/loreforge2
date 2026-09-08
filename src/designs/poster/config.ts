// Poster config v1 (P08D-T03, 03_TARGET_CONTRACTS: Poster stays a
// compatibility Design). Deliberately a small vocabulary — this is not a
// first-class proof layer; T08 owns its legacy cleanup.
import { resolveFontStack } from '@/lib/theme/fonts'
import { mixColors, readableTextColor } from '@/lib/theme/color'
import type { DesignAssetRef, FontKey, LegacyDomainAppearance, ValidationResult } from '@/lib/design/contracts'
import { fail, isFontKey, isHexColor, ok, pickUnion } from '@/lib/design/validate'

export type PosterConfigV1 = {
  palette: {
    primary: string
    accent: string
    page: string
  }
  typography: {
    displayFontKey: FontKey
    bodyFontKey: FontKey
  }
  masthead: {
    treatment: 'bold' | 'stacked'
  }
  document: {
    treatment: 'feature' | 'brief'
  }
}

const MASTHEADS = ['bold', 'stacked'] as const
const DOC_TREATMENTS = ['feature', 'brief'] as const
const FONT_KEYS = ['georgia', 'palatino', 'newsreader', 'tahoma', 'trebuchet', 'verdana', 'lato'] as const

export const posterDefaults: PosterConfigV1 = {
  palette: { primary: '#123C5A', accent: '#21A4B8', page: '#F8FAFC' },
  typography: { displayFontKey: 'trebuchet', bodyFontKey: 'verdana' },
  masthead: { treatment: 'bold' },
  document: { treatment: 'feature' },
}

export function validatePosterConfig(raw: unknown): ValidationResult<PosterConfigV1> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(['Poster config must be an object.'])
  const value = raw as Record<string, unknown>
  const errors: string[] = []

  const palette = value.palette as Record<string, unknown> | undefined
  if (!palette || typeof palette !== 'object') errors.push('palette is required.')
  else {
    for (const key of ['primary', 'accent', 'page'] as const) {
      if (!isHexColor(palette[key])) errors.push(`palette.${key} must be a #rrggbb color.`)
    }
  }
  const typography = value.typography as Record<string, unknown> | undefined
  if (!typography || typeof typography !== 'object') errors.push('typography is required.')
  else {
    if (!isFontKey(typography.displayFontKey)) errors.push('typography.displayFontKey must be a curated font key.')
    if (!isFontKey(typography.bodyFontKey)) errors.push('typography.bodyFontKey must be a curated font key.')
  }
  const masthead = value.masthead as Record<string, unknown> | undefined
  if (!masthead || typeof masthead !== 'object') errors.push('masthead is required.')
  else if (!MASTHEADS.includes(masthead.treatment as never)) errors.push('masthead.treatment must be bold|stacked.')
  const document = value.document as Record<string, unknown> | undefined
  if (!document || typeof document !== 'object') errors.push('document is required.')
  else if (!DOC_TREATMENTS.includes(document.treatment as never)) errors.push('document.treatment must be feature|brief.')

  if (errors.length > 0) return fail(errors)
  return ok({
    palette: {
      primary: (palette as Record<string, string>).primary,
      accent: (palette as Record<string, string>).accent,
      page: (palette as Record<string, string>).page,
    },
    typography: {
      displayFontKey: (typography as { displayFontKey: PosterConfigV1['typography']['displayFontKey'] }).displayFontKey,
      bodyFontKey: (typography as { bodyFontKey: PosterConfigV1['typography']['bodyFontKey'] }).bodyFontKey,
    },
    masthead: { treatment: (masthead as { treatment: PosterConfigV1['masthead']['treatment'] }).treatment },
    document: { treatment: (document as { treatment: PosterConfigV1['document']['treatment'] }).treatment },
  })
}

export function migratePosterConfig(fromVersion: number, raw: unknown): ValidationResult<PosterConfigV1> {
  if (fromVersion !== 1) return fail([`Poster config version ${fromVersion} is not supported.`])
  return validatePosterConfig(raw)
}

export function posterFromLegacy(legacy: LegacyDomainAppearance): PosterConfigV1 {
  const pick = (key: string, fallback: string) => typeof legacy[key as keyof LegacyDomainAppearance] === 'string'
    ? (legacy[key as keyof LegacyDomainAppearance] as string)
    : fallback
  return {
    palette: {
      primary: pick('primaryColor', posterDefaults.palette.primary),
      accent: pick('accentColor', posterDefaults.palette.accent),
      page: pick('backgroundColor', posterDefaults.palette.page),
    },
    typography: {
      displayFontKey: pickUnion(pick('headingFontKey', posterDefaults.typography.displayFontKey), FONT_KEYS, posterDefaults.typography.displayFontKey),
      bodyFontKey: pickUnion(pick('bodyFontKey', posterDefaults.typography.bodyFontKey), FONT_KEYS, posterDefaults.typography.bodyFontKey),
    },
    masthead: { treatment: 'bold' },
    document: { treatment: 'feature' },
  }
}

export function resolvePosterTheme(config: PosterConfigV1): { base: { primary: string; secondary: string; accent: string; pageBg: string; surfaceBg: string; surfaceBorder: string; textOnPrimary: string; headingFont: string; bodyFont: string; mutedText: string }; vars?: Record<string, string> } {
  const pageBg = config.palette.page
  return {
    base: {
      primary: config.palette.primary,
      secondary: config.palette.primary,
      accent: config.palette.accent,
      pageBg,
      surfaceBg: mixColors(pageBg, '#FFFFFF', 0.65),
      surfaceBorder: config.palette.primary,
      textOnPrimary: readableTextColor(config.palette.primary),
      headingFont: resolveFontStack(config.typography.displayFontKey),
      bodyFont: resolveFontStack(config.typography.bodyFontKey),
      mutedText: mixColors(config.palette.primary, pageBg, 0.55),
    },
    vars: {
      '--poster-masthead': config.masthead.treatment,
      '--poster-document': config.document.treatment,
    },
  }
}

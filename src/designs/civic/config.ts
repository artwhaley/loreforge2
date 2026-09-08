// Civic config v1 (P08D-T03, 03_TARGET_CONTRACTS §8). Civic's OWN vocabulary:
// palette, typography, layout.width/header, document treatment, background
// treatment/image, banner image. No shared HEADER_LAYOUTS validator — these
// concepts are Civic's, and Ledger speaks a different language.
import { CONTENT_WIDTHS, resolveFontStack } from '@/lib/theme/fonts'
import { mixColors, readableTextColor } from '@/lib/theme/color'
import type { DesignAssetRef, FontKey, LegacyDomainAppearance, ValidationResult } from '@/lib/design/contracts'
import { fail, isFontKey, isHexColor, isNullOrDesignAssetRef, ok, pickUnion } from '@/lib/design/validate'

export type CivicConfigV1 = {
  palette: {
    primary: string
    secondary: string
    accent: string
    page: string
  }
  typography: {
    headingFontKey: FontKey
    bodyFontKey: FontKey
  }
  layout: {
    width: 'narrow' | 'standard' | 'wide'
    header: 'centered' | 'compact' | 'banner'
  }
  document: {
    treatment: 'classic' | 'modern'
  }
  background: {
    treatment: 'plain' | 'washes' | 'soft' | 'vignette'
    image: DesignAssetRef | null
  }
  banner: {
    image: DesignAssetRef | null
  }
}

const WIDTHS = ['narrow', 'standard', 'wide'] as const
const HEADERS = ['centered', 'compact', 'banner'] as const
const DOC_TREATMENTS = ['classic', 'modern'] as const
const BACKGROUNDS = ['plain', 'washes', 'soft', 'vignette'] as const

/** Legacy header vocabulary → Civic layout.header vocabulary. */
const LEGACY_HEADER: Record<string, CivicConfigV1['layout']['header']> = {
  centered: 'centered',
  'left-aligned': 'compact',
  'banner-forward': 'banner',
}

export const civicDefaults: CivicConfigV1 = {
  palette: { primary: '#243145', secondary: '#8A6A3C', accent: '#B9975B', page: '#F3EFE6' },
  typography: { headingFontKey: 'georgia', bodyFontKey: 'verdana' },
  layout: { width: 'standard', header: 'centered' },
  document: { treatment: 'classic' },
  background: { treatment: 'plain', image: null },
  banner: { image: null },
}

export function validateCivicConfig(raw: unknown): ValidationResult<CivicConfigV1> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(['Civic config must be an object.'])
  const value = raw as Record<string, unknown>
  const errors: string[] = []

  const palette = value.palette as Record<string, unknown> | undefined
  if (!palette || typeof palette !== 'object') errors.push('palette is required.')
  else {
    for (const key of ['primary', 'secondary', 'accent', 'page'] as const) {
      if (!isHexColor(palette[key])) errors.push(`palette.${key} must be a #rrggbb color.`)
    }
  }
  const typography = value.typography as Record<string, unknown> | undefined
  if (!typography || typeof typography !== 'object') errors.push('typography is required.')
  else {
    if (!isFontKey(typography.headingFontKey)) errors.push('typography.headingFontKey must be a curated font key.')
    if (!isFontKey(typography.bodyFontKey)) errors.push('typography.bodyFontKey must be a curated font key.')
  }
  const layout = value.layout as Record<string, unknown> | undefined
  if (!layout || typeof layout !== 'object') errors.push('layout is required.')
  else {
    if (!WIDTHS.includes(layout.width as never)) errors.push('layout.width must be narrow|standard|wide.')
    if (!HEADERS.includes(layout.header as never)) errors.push('layout.header must be centered|compact|banner.')
  }
  const document = value.document as Record<string, unknown> | undefined
  if (!document || typeof document !== 'object') errors.push('document is required.')
  else if (!DOC_TREATMENTS.includes(document.treatment as never)) errors.push('document.treatment must be classic|modern.')

  const background = value.background as Record<string, unknown> | undefined
  if (!background || typeof background !== 'object') errors.push('background is required.')
  else {
    if (!BACKGROUNDS.includes(background.treatment as never)) errors.push('background.treatment must be plain|washes|soft|vignette.')
    if (!isNullOrDesignAssetRef(background.image, 'civic')) errors.push('background.image must be null or a local asset reference.')
  }
  const banner = value.banner as Record<string, unknown> | undefined
  if (!banner || typeof banner !== 'object') errors.push('banner is required.')
  else if (!isNullOrDesignAssetRef(banner.image, 'civic')) errors.push('banner.image must be null or a local asset reference.')

  if (errors.length > 0) return fail(errors)
  // Every group pushed an error when missing, so all are present here.
  const bg = background as Record<string, unknown>
  const bn = banner as Record<string, unknown>
  return ok({
    palette: {
      primary: (palette as Record<string, string>).primary,
      secondary: (palette as Record<string, string>).secondary,
      accent: (palette as Record<string, string>).accent,
      page: (palette as Record<string, string>).page,
    },
    typography: {
      headingFontKey: (typography as { headingFontKey: CivicConfigV1['typography']['headingFontKey'] }).headingFontKey,
      bodyFontKey: (typography as { bodyFontKey: CivicConfigV1['typography']['bodyFontKey'] }).bodyFontKey,
    },
    layout: {
      width: (layout as { width: CivicConfigV1['layout']['width'] }).width,
      header: (layout as { header: CivicConfigV1['layout']['header'] }).header,
    },
    document: { treatment: (document as { treatment: CivicConfigV1['document']['treatment'] }).treatment },
    background: {
      treatment: (bg.treatment as CivicConfigV1['background']['treatment']),
      image: (bg.image as DesignAssetRef | null) ?? null,
    },
    banner: { image: (bn.image as DesignAssetRef | null) ?? null },
  })
}

export function migrateCivicConfig(fromVersion: number, raw: unknown): ValidationResult<CivicConfigV1> {
  // Only v1 exists today; unknown versions fail closed to defaults by the caller.
  if (fromVersion !== 1) return fail([`Civic config version ${fromVersion} is not supported.`])
  return validateCivicConfig(raw)
}

export function civicFromLegacy(legacy: LegacyDomainAppearance): CivicConfigV1 {
  const pick = (key: string, fallback: string) => typeof legacy[key as keyof LegacyDomainAppearance] === 'string'
    ? (legacy[key as keyof LegacyDomainAppearance] as string)
    : fallback
  return {
    palette: {
      primary: pick('primaryColor', civicDefaults.palette.primary),
      secondary: pick('secondaryColor', civicDefaults.palette.secondary),
      accent: pick('accentColor', civicDefaults.palette.accent),
      page: pick('backgroundColor', civicDefaults.palette.page),
    },
    typography: {
      headingFontKey: pickUnion(pick('headingFontKey', civicDefaults.typography.headingFontKey), ['georgia', 'palatino', 'newsreader', 'tahoma', 'trebuchet', 'verdana', 'lato'] as const, civicDefaults.typography.headingFontKey),
      bodyFontKey: pickUnion(pick('bodyFontKey', civicDefaults.typography.bodyFontKey), ['georgia', 'palatino', 'newsreader', 'tahoma', 'trebuchet', 'verdana', 'lato'] as const, civicDefaults.typography.bodyFontKey),
    },
    layout: {
      width: pickUnion(pick('contentWidth', 'standard'), WIDTHS, civicDefaults.layout.width),
      header: LEGACY_HEADER[pick('headerLayout', 'centered')] ?? civicDefaults.layout.header,
    },
    document: {
      treatment: pickUnion(pick('documentStyle', 'classic'), DOC_TREATMENTS, civicDefaults.document.treatment),
    },
    background: {
      treatment: pickUnion(pick('backgroundTreatment', 'plain'), BACKGROUNDS, civicDefaults.background.treatment),
      image: null,
    },
    banner: { image: null },
  }
}

export function resolveCivicTheme(config: CivicConfigV1): { base: { primary: string; secondary: string; accent: string; pageBg: string; surfaceBg: string; surfaceBorder: string; textOnPrimary: string; headingFont: string; bodyFont: string; mutedText: string }; vars?: Record<string, string> } {
  const pageBg = config.palette.page
  return {
    base: {
      primary: config.palette.primary,
      secondary: config.palette.secondary,
      accent: config.palette.accent,
      pageBg,
      surfaceBg: mixColors(pageBg, '#FFFFFF', 0.65),
      surfaceBorder: config.palette.primary,
      textOnPrimary: readableTextColor(config.palette.primary),
      headingFont: resolveFontStack(config.typography.headingFontKey),
      bodyFont: resolveFontStack(config.typography.bodyFontKey),
      mutedText: mixColors(config.palette.primary, pageBg, 0.55),
    },
    vars: {
      '--civic-width': CONTENT_WIDTHS[config.layout.width].shell,
      '--civic-header': config.layout.header,
      '--civic-document': config.document.treatment,
      '--civic-background': config.background.treatment,
      '--civic-background-image': config.background.image?.url ?? 'none',
      '--civic-banner-image': config.banner.image?.url ?? 'none',
    },
  }
}

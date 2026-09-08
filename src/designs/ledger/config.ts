// Ledger config v1 (P08D-T03, 03_TARGET_CONTRACTS §9). Ledger speaks its OWN
// vocabulary: ink/paper palette, display/body typography, rail width/density,
// masthead treatment, rule strength, register/docket document treatment,
// paper texture. Do not rename these to Civic vocabulary — if Ledger had to
// expose `headerLayout=centered` after P08D, the architecture would be
// unfinished.
import { resolveFontStack } from '@/lib/theme/fonts'
import { mixColors, readableTextColor } from '@/lib/theme/color'
import type { DesignAssetRef, FontKey, LegacyDomainAppearance, ValidationResult } from '@/lib/design/contracts'
import { fail, isFontKey, isHexColor, isNullOrDesignAssetRef, ok, pickUnion } from '@/lib/design/validate'

export type LedgerConfigV1 = {
  palette: {
    ink: string
    secondaryInk: string
    accent: string
    paper: string
  }
  typography: {
    displayFontKey: FontKey
    bodyFontKey: FontKey
  }
  rail: {
    width: 'narrow' | 'standard' | 'wide'
    density: 'airy' | 'standard' | 'compact'
  }
  masthead: {
    treatment: 'formal' | 'compact' | 'folio'
    image: DesignAssetRef | null
  }
  rules: {
    strength: 'hairline' | 'standard' | 'heavy'
  }
  document: {
    treatment: 'register' | 'docket'
  }
  paperTexture: DesignAssetRef | null
}

const RAIL_WIDTHS = ['narrow', 'standard', 'wide'] as const
const DENSITIES = ['airy', 'standard', 'compact'] as const
const MASTHEADS = ['formal', 'compact', 'folio'] as const
const RULE_STRENGTHS = ['hairline', 'standard', 'heavy'] as const
const DOC_TREATMENTS = ['register', 'docket'] as const

export const ledgerDefaults: LedgerConfigV1 = {
  palette: { ink: '#173F58', secondaryInk: '#315D76', accent: '#BD5638', paper: '#F5F1E9' },
  typography: { displayFontKey: 'newsreader', bodyFontKey: 'lato' },
  rail: { width: 'standard', density: 'standard' },
  masthead: { treatment: 'formal', image: null },
  rules: { strength: 'standard' },
  document: { treatment: 'register' },
  paperTexture: null,
}

export function validateLedgerConfig(raw: unknown): ValidationResult<LedgerConfigV1> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(['Ledger config must be an object.'])
  const value = raw as Record<string, unknown>
  const errors: string[] = []

  const palette = value.palette as Record<string, unknown> | undefined
  if (!palette || typeof palette !== 'object') errors.push('palette is required.')
  else {
    for (const key of ['ink', 'secondaryInk', 'accent', 'paper'] as const) {
      if (!isHexColor(palette[key])) errors.push(`palette.${key} must be a #rrggbb color.`)
    }
  }
  const typography = value.typography as Record<string, unknown> | undefined
  if (!typography || typeof typography !== 'object') errors.push('typography is required.')
  else {
    if (!isFontKey(typography.displayFontKey)) errors.push('typography.displayFontKey must be a curated font key.')
    if (!isFontKey(typography.bodyFontKey)) errors.push('typography.bodyFontKey must be a curated font key.')
  }
  const rail = value.rail as Record<string, unknown> | undefined
  if (!rail || typeof rail !== 'object') errors.push('rail is required.')
  else {
    if (!RAIL_WIDTHS.includes(rail.width as never)) errors.push('rail.width must be narrow|standard|wide.')
    if (!DENSITIES.includes(rail.density as never)) errors.push('rail.density must be airy|standard|compact.')
  }
  const masthead = value.masthead as Record<string, unknown> | undefined
  if (!masthead || typeof masthead !== 'object') errors.push('masthead is required.')
  else {
    if (!MASTHEADS.includes(masthead.treatment as never)) errors.push('masthead.treatment must be formal|compact|folio.')
    if (!isNullOrDesignAssetRef(masthead.image, 'ledger')) errors.push('masthead.image must be null or a local asset reference.')
  }
  const rules = value.rules as Record<string, unknown> | undefined
  if (!rules || typeof rules !== 'object') errors.push('rules is required.')
  else if (!RULE_STRENGTHS.includes(rules.strength as never)) errors.push('rules.strength must be hairline|standard|heavy.')
  const document = value.document as Record<string, unknown> | undefined
  if (!document || typeof document !== 'object') errors.push('document is required.')
  else if (!DOC_TREATMENTS.includes(document.treatment as never)) errors.push('document.treatment must be register|docket.')
  if (!isNullOrDesignAssetRef(value.paperTexture, 'ledger')) errors.push('paperTexture must be null or a local asset reference.')

  if (errors.length > 0) return fail(errors)
  // Every group pushed an error when missing, so all are present here.
  const mh = masthead as Record<string, unknown>
  return ok({
    palette: {
      ink: (palette as Record<string, string>).ink,
      secondaryInk: (palette as Record<string, string>).secondaryInk,
      accent: (palette as Record<string, string>).accent,
      paper: (palette as Record<string, string>).paper,
    },
    typography: {
      displayFontKey: (typography as { displayFontKey: LedgerConfigV1['typography']['displayFontKey'] }).displayFontKey,
      bodyFontKey: (typography as { bodyFontKey: LedgerConfigV1['typography']['bodyFontKey'] }).bodyFontKey,
    },
    rail: {
      width: (rail as { width: LedgerConfigV1['rail']['width'] }).width,
      density: (rail as { density: LedgerConfigV1['rail']['density'] }).density,
    },
    masthead: {
      treatment: (mh.treatment as LedgerConfigV1['masthead']['treatment']),
      image: (mh.image as DesignAssetRef | null) ?? null,
    },
    rules: { strength: (rules as { strength: LedgerConfigV1['rules']['strength'] }).strength },
    document: { treatment: (document as { treatment: LedgerConfigV1['document']['treatment'] }).treatment },
    paperTexture: (value.paperTexture as DesignAssetRef | null) ?? null,
  })
}

export function migrateLedgerConfig(fromVersion: number, raw: unknown): ValidationResult<LedgerConfigV1> {
  if (fromVersion !== 1) return fail([`Ledger config version ${fromVersion} is not supported.`])
  return validateLedgerConfig(raw)
}

export function ledgerFromLegacy(legacy: LegacyDomainAppearance): LedgerConfigV1 {
  // The current poster/template presets map into Ledger vocabulary best-effort:
  // the shared legacy palette tokens become ink/secondary/accent/paper, legacy
  // documentStyle classic→register, modern→docket.
  const pick = (key: string, fallback: string) => typeof legacy[key as keyof LegacyDomainAppearance] === 'string'
    ? (legacy[key as keyof LegacyDomainAppearance] as string)
    : fallback
  return {
    palette: {
      ink: pick('primaryColor', ledgerDefaults.palette.ink),
      secondaryInk: pick('secondaryColor', ledgerDefaults.palette.secondaryInk),
      accent: pick('accentColor', ledgerDefaults.palette.accent),
      paper: pick('backgroundColor', ledgerDefaults.palette.paper),
    },
    typography: {
      displayFontKey: pickUnion(pick('headingFontKey', ledgerDefaults.typography.displayFontKey), ['georgia', 'palatino', 'newsreader', 'tahoma', 'trebuchet', 'verdana', 'lato'] as const, ledgerDefaults.typography.displayFontKey),
      bodyFontKey: pickUnion(pick('bodyFontKey', ledgerDefaults.typography.bodyFontKey), ['georgia', 'palatino', 'newsreader', 'tahoma', 'trebuchet', 'verdana', 'lato'] as const, ledgerDefaults.typography.bodyFontKey),
    },
    rail: { width: 'standard', density: 'standard' },
    masthead: { treatment: 'formal', image: null },
    rules: { strength: 'standard' },
    document: { treatment: pick('documentStyle', 'classic') === 'modern' ? 'docket' : 'register' },
    paperTexture: null,
  }
}

export function resolveLedgerTheme(config: LedgerConfigV1): { base: { primary: string; secondary: string; accent: string; pageBg: string; surfaceBg: string; surfaceBorder: string; textOnPrimary: string; headingFont: string; bodyFont: string; mutedText: string }; vars?: Record<string, string> } {
  const pageBg = config.palette.paper
  return {
    base: {
      primary: config.palette.ink,
      secondary: config.palette.secondaryInk,
      accent: config.palette.accent,
      pageBg,
      surfaceBg: mixColors(pageBg, '#FFFFFF', 0.65),
      surfaceBorder: config.palette.ink,
      textOnPrimary: readableTextColor(config.palette.ink),
      headingFont: resolveFontStack(config.typography.displayFontKey),
      bodyFont: resolveFontStack(config.typography.bodyFontKey),
      mutedText: mixColors(config.palette.ink, pageBg, 0.55),
    },
    vars: {
      '--ledger-rail-width': config.rail.width,
      '--ledger-rail-density': config.rail.density,
      '--ledger-masthead': config.masthead.treatment,
      '--ledger-masthead-image': config.masthead.image?.url ?? 'none',
      '--ledger-rules': config.rules.strength,
      '--ledger-document': config.document.treatment,
      '--ledger-paper-texture': config.paperTexture?.url ?? 'none',
    },
  }
}

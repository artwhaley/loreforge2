import type { Tenant } from '@/payload-types'

import { mixColors, readableTextColor } from './color'

/**
 * Curated font allowlist. Values map to widely available system fonts plus
 * the two platform brand faces (spec 6.2: no arbitrary remote font URLs).
 */
export const FONT_STACKS: Record<string, string> = {
  georgia: "Georgia, 'Times New Roman', Times, serif",
  palatino: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  tahoma: 'Tahoma, Verdana, Geneva, sans-serif',
  trebuchet: "'Trebuchet MS', Tahoma, Verdana, sans-serif",
  verdana: 'Verdana, Geneva, Tahoma, sans-serif',
  newsreader: "'Newsreader', Georgia, 'Times New Roman', serif",
  lato: "'Lato', Tahoma, Verdana, sans-serif",
}

export function resolveFontStack(key: string): string {
  return FONT_STACKS[key] ?? FONT_STACKS.verdana
}

/** Curated UI options for the Theme Studio. */
export const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'georgia', label: 'Georgia (traditional serif)' },
  { value: 'palatino', label: 'Palatino (bookish serif)' },
  { value: 'newsreader', label: 'Newsreader (Loreforge editorial serif)' },
  { value: 'tahoma', label: 'Tahoma (compact sans)' },
  { value: 'trebuchet', label: 'Trebuchet (friendly sans)' },
  { value: 'verdana', label: 'Verdana (readable sans)' },
  { value: 'lato', label: 'Lato (Loreforge clean sans)' },
]

/**
 * First-class design templates (owner decision 2026-09-05): three complete,
 * distinct top-level site designs. Every template consumes the same palette
 * and typography tokens, so each remains fully themeable.
 */
export const DESIGN_TEMPLATES = {
  civic: {
    label: 'Civic (classic community)',
    description: 'An institutional portal: composed masthead, a clear directory, and a structured record grid.',
  },
  ledger: {
    label: 'Ledger (Loreforge print)',
    description: 'An editorial archive: a persistent side index, generous reading column, and a ruled register.',
  },
  poster: {
    label: 'Poster (bold modern)',
    description: 'A cultural publication: monumental type, asymmetric compositions, and graphic destination tiles.',
  },
} as const

export type DesignTemplateKey = keyof typeof DESIGN_TEMPLATES

export const DESIGN_TEMPLATE_OPTIONS = (Object.entries(DESIGN_TEMPLATES) as Array<[DesignTemplateKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))

/**
 * Color palettes (owner decision 2026-09-05: richer theming). Each preset
 * bundles the four working tokens; the Studio can still tweak every value.
 */
export const THEME_PRESETS: Record<
  'heritage' | 'modern' | 'ink' | 'gallery' | 'verdant' | 'nocturne',
  {
    label: string
    primary: string
    secondary: string
    accent: string
    background: string
    headingFontKey: string
    bodyFontKey: string
  }
> = {
  heritage: {
    label: 'Heritage (traditional civic)',
    primary: '#243145',
    secondary: '#8A6A3C',
    accent: '#B9975B',
    background: '#F3EFE6',
    headingFontKey: 'georgia',
    bodyFontKey: 'verdana',
  },
  modern: {
    label: 'Modern (coastal metropolitan)',
    primary: '#123C5A',
    secondary: '#E8EDF1',
    accent: '#21A4B8',
    background: '#F8FAFC',
    headingFontKey: 'trebuchet',
    bodyFontKey: 'verdana',
  },
  ink: {
    label: 'Ink (Loreforge print)',
    primary: '#173F58',
    secondary: '#315D76',
    accent: '#BD5638',
    background: '#F5F1E9',
    headingFontKey: 'newsreader',
    bodyFontKey: 'lato',
  },
  gallery: {
    label: 'Gallery (quiet light)',
    primary: '#2E2A26',
    secondary: '#6B6257',
    accent: '#9C6644',
    background: '#FBF9F4',
    headingFontKey: 'palatino',
    bodyFontKey: 'verdana',
  },
  verdant: {
    label: 'Verdant (forest civic)',
    primary: '#1F3D2B',
    secondary: '#5C7C4A',
    accent: '#C9A227',
    background: '#F4F6EF',
    headingFontKey: 'georgia',
    bodyFontKey: 'tahoma',
  },
  nocturne: {
    label: 'Nocturne (dramatic dark)',
    primary: '#14161C',
    secondary: '#232936',
    accent: '#D4A017',
    background: '#0B0D12',
    headingFontKey: 'newsreader',
    bodyFontKey: 'lato',
  },
}

/** Frozen layout axes. */
export const CONTENT_WIDTHS = {
  narrow: { label: 'Narrow (focused reading)', shell: 'min(900px, calc(100% - 3rem))' },
  standard: { label: 'Standard', shell: 'min(1200px, calc(100% - 3rem))' },
  wide: { label: 'Wide', shell: 'min(1400px, calc(100% - 3rem))' },
} as const

export type ContentWidthKey = keyof typeof CONTENT_WIDTHS

/**
 * Header layouts (owner decision 2026-09-05): three genuinely different
 * navigation/identity presentations, distinct within every design template.
 */
export const HEADER_LAYOUTS = {
  centered: { label: 'Centered masthead' },
  'left-aligned': { label: 'Compact bar' },
  'banner-forward': { label: 'Banner hero' },
} as const

export type HeaderLayoutKey = keyof typeof HEADER_LAYOUTS

export const DOCUMENT_STYLES = {
  classic: { label: 'Classic (serif record sheet)' },
  modern: { label: 'Modern (clean reading)' },
} as const

export type DocumentStyleKey = keyof typeof DOCUMENT_STYLES

/**
 * Background treatments (owner decision 2026-09-05: treatments must be
 * useful without an uploaded image). `plain`/`washes` never require media;
 * the image-backed pair still does.
 */
export const BACKGROUND_TREATMENTS = {
  plain: { label: 'Plain color' },
  washes: { label: 'Color washes', requiresImage: false },
  soft: { label: 'Soft texture', requiresImage: true },
  vignette: { label: 'Vignette', requiresImage: true },
} as const

export type BackgroundTreatmentKey = keyof typeof BACKGROUND_TREATMENTS

export const CONTENT_WIDTH_OPTIONS = (Object.entries(CONTENT_WIDTHS) as Array<[ContentWidthKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))
export const HEADER_LAYOUT_OPTIONS = (Object.entries(HEADER_LAYOUTS) as Array<[HeaderLayoutKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))
export const DOCUMENT_STYLE_OPTIONS = (Object.entries(DOCUMENT_STYLES) as Array<[DocumentStyleKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))
export const BACKGROUND_TREATMENT_OPTIONS = (Object.entries(BACKGROUND_TREATMENTS) as Array<[BackgroundTreatmentKey, { label: string; requiresImage?: boolean }]>).map(([value, v]) => ({ value, label: v.label, requiresImage: Boolean(v.requiresImage) }))

const DEFAULTS = {
  designTemplate: 'civic',
  contentWidth: 'standard',
  headerLayout: 'centered',
  documentStyle: 'classic',
  backgroundTreatment: 'plain',
} as const

function pick<T extends string>(value: unknown, keys: readonly T[], fallback: T): T {
  return typeof value === 'string' && (keys as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Resolve a site-media doc to a statically-served URL under /public. */
export function mediaSrc(
  media: { filename?: string | null } | number | null | undefined,
): string {
  return media && typeof media === 'object' && media.filename ? `/media/${media.filename}` : ''
}

/** Semantic theme token bundle derived from tenant theme settings (never CSS blobs). */
export type ThemeTokens = {
  designTemplate: DesignTemplateKey
  primary: string
  secondary: string
  accent: string
  pageBg: string
  surfaceBg: string
  surfaceBorder: string
  textOnPrimary: string
  headingFont: string
  bodyFont: string
  mutedText: string
  contentWidth: ContentWidthKey
  shellWidth: string
  headerLayout: HeaderLayoutKey
  documentStyle: DocumentStyleKey
  backgroundTreatment: BackgroundTreatmentKey
  backgroundOverlay: string | null
}

type ThemeVars = {
  primary: string
  secondary: string
  accent: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
  designTemplate?: unknown
  contentWidth?: unknown
  headerLayout?: unknown
  documentStyle?: unknown
  backgroundTreatment?: unknown
  backgroundImageSet?: boolean
}

/** Pure token resolver used by both the server renderer and the Studio preview. */
export function tokensFromVars(vars: ThemeVars): ThemeTokens {
  const textOnPrimary = readableTextColor(vars.primary)
  const pageBg = vars.backgroundColor
  // Derived surfaces (P08-T01 §1): computed from the palette, not hand-picked.
  const surfaceBg = mixColors(pageBg, '#FFFFFF', 0.65)
  const treatment = pick(vars.backgroundTreatment, Object.keys(BACKGROUND_TREATMENTS) as BackgroundTreatmentKey[], DEFAULTS.backgroundTreatment)
  return {
    designTemplate: pick(vars.designTemplate, Object.keys(DESIGN_TEMPLATES) as DesignTemplateKey[], DEFAULTS.designTemplate),
    primary: vars.primary,
    secondary: vars.secondary,
    accent: vars.accent,
    pageBg,
    surfaceBg,
    surfaceBorder: vars.primary,
    textOnPrimary,
    headingFont: resolveFontStack(vars.headingFontKey),
    bodyFont: resolveFontStack(vars.bodyFontKey),
    mutedText: mixColors(vars.primary, pageBg, 0.55),
    contentWidth: pick(vars.contentWidth, Object.keys(CONTENT_WIDTHS) as ContentWidthKey[], DEFAULTS.contentWidth),
    shellWidth: CONTENT_WIDTHS[pick(vars.contentWidth, Object.keys(CONTENT_WIDTHS) as ContentWidthKey[], DEFAULTS.contentWidth)].shell,
    headerLayout: pick(vars.headerLayout, Object.keys(HEADER_LAYOUTS) as HeaderLayoutKey[], DEFAULTS.headerLayout),
    documentStyle: pick(vars.documentStyle, Object.keys(DOCUMENT_STYLES) as DocumentStyleKey[], DEFAULTS.documentStyle),
    backgroundTreatment: treatment,
    backgroundOverlay: vars.backgroundImageSet && treatment === 'vignette' ? 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.38) 100%)' : vars.backgroundImageSet && treatment === 'soft' ? 'rgba(255, 255, 255, 0.72)' : null,
  }
}

export function resolveThemeTokens(tenant: Tenant): ThemeTokens {
  return tokensFromVars({
    primary: tenant.primaryColor,
    secondary: tenant.secondaryColor,
    accent: tenant.accentColor,
    backgroundColor: tenant.backgroundColor,
    headingFontKey: tenant.headingFontKey,
    bodyFontKey: tenant.bodyFontKey,
    designTemplate: (tenant as unknown as { designTemplate?: unknown }).designTemplate,
    contentWidth: (tenant as unknown as { contentWidth?: unknown }).contentWidth,
    headerLayout: (tenant as unknown as { headerLayout?: unknown }).headerLayout,
    documentStyle: (tenant as unknown as { documentStyle?: unknown }).documentStyle,
    backgroundTreatment: (tenant as unknown as { backgroundTreatment?: unknown }).backgroundTreatment,
    backgroundImageSet: Boolean((tenant as unknown as { backgroundImage?: unknown }).backgroundImage),
  })
}

/** Serialize tokens into CSS custom properties for the themed wrapper. */
export function themeTokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    '--tenant-template': tokens.designTemplate,
    '--tenant-primary': tokens.primary,
    '--tenant-secondary': tokens.secondary,
    '--tenant-accent': tokens.accent,
    '--tenant-page-bg': tokens.pageBg,
    '--tenant-surface-bg': tokens.surfaceBg,
    '--tenant-surface-border': tokens.surfaceBorder,
    '--tenant-text-on-primary': tokens.textOnPrimary,
    '--tenant-heading-font': tokens.headingFont,
    '--tenant-body-font': tokens.bodyFont,
    '--tenant-muted-text': tokens.mutedText,
    '--tenant-shell-width': tokens.shellWidth,
    '--tenant-background-overlay': tokens.backgroundOverlay ?? 'none',
  }
}
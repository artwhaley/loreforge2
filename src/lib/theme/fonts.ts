import type { Tenant } from '@/payload-types'

/**
 * Curated font allowlist. Values map to widely available system fonts;
 * no arbitrary remote font URLs are permitted (spec 6.2).
 */
export const FONT_STACKS: Record<string, string> = {
  georgia: "Georgia, 'Times New Roman', Times, serif",
  palatino: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  tahoma: 'Tahoma, Verdana, Geneva, sans-serif',
  trebuchet: "'Trebuchet MS', Tahoma, Verdana, sans-serif",
  verdana: 'Verdana, Geneva, Tahoma, sans-serif',
}

export function resolveFontStack(key: string): string {
  return FONT_STACKS[key] ?? FONT_STACKS.verdana
}

/** Curated UI options for the Theme Studio. */
export const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'georgia', label: 'Georgia (traditional serif)' },
  { value: 'palatino', label: 'Palatino (bookish serif)' },
  { value: 'tahoma', label: 'Tahoma (compact sans)' },
  { value: 'trebuchet', label: 'Trebuchet (friendly sans)' },
  { value: 'verdana', label: 'Verdana (readable sans)' },
]

/** Known theme bundles (canonical values), used to populate a preset selection. */
export const THEME_PRESETS: Record<
  'heritage' | 'modern',
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
}

/** Resolve a site-media doc to a statically-served URL under /public. */
export function mediaSrc(
  media: { filename?: string | null } | number | null | undefined,
): string {
  return media && typeof media === 'object' && media.filename ? `/media/${media.filename}` : ''
}

/** Semantic theme token bundle derived from tenant theme settings (never CSS blobs). */
export type ThemeTokens = {
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
}

type ThemeVars = {
  primary: string
  secondary: string
  accent: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
}

/** Pure token resolver used by both the server renderer and the Studio preview. */
export function tokensFromVars(vars: ThemeVars): ThemeTokens {
  return {
    primary: vars.primary,
    secondary: vars.secondary,
    accent: vars.accent,
    pageBg: vars.backgroundColor,
    surfaceBg: '#FFFFFF',
    surfaceBorder: vars.primary,
    textOnPrimary: '#FFFFFF',
    headingFont: resolveFontStack(vars.headingFontKey),
    bodyFont: resolveFontStack(vars.bodyFontKey),
    mutedText: '#5A5A5A',
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
  })
}

/** Serialize tokens into CSS custom properties for the themed wrapper. */
export function themeTokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
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
  }
}

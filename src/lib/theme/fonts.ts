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

export function resolveThemeTokens(tenant: Tenant): ThemeTokens {
  const { primaryColor, secondaryColor, accentColor, backgroundColor, headingFontKey, bodyFontKey } =
    tenant

  return {
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor,
    pageBg: backgroundColor,
    surfaceBg: '#FFFFFF',
    surfaceBorder: primaryColor,
    textOnPrimary: '#FFFFFF',
    headingFont: resolveFontStack(headingFontKey),
    bodyFont: resolveFontStack(bodyFontKey),
    mutedText: '#5A5A5A',
  }
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

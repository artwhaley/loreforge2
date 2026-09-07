// Base semantic token serializer (P08D-T03-H, 03_TARGET_CONTRACTS §4).
// Every Design's config.resolveTheme returns { base, vars? }; this module
// serializes the universal --tenant-* bridge plus Design-namespaced vars.
// Pure and client-safe; no Design-specific global axis maps live here (G13).
import { BASE_THEME_VARS, type BaseDesignTheme } from './contracts'

export type ResolvedDesignTheme = {
  base: BaseDesignTheme
  vars?: Record<string, string>
}

/** Serialize the universal bridge to --tenant-* custom properties. */
export function serializeBaseTheme(base: BaseDesignTheme): Record<string, string> {
  return {
    [BASE_THEME_VARS.primary]: base.primary,
    [BASE_THEME_VARS.secondary]: base.secondary,
    [BASE_THEME_VARS.accent]: base.accent,
    [BASE_THEME_VARS.pageBg]: base.pageBg,
    [BASE_THEME_VARS.surfaceBg]: base.surfaceBg,
    [BASE_THEME_VARS.surfaceBorder]: base.surfaceBorder,
    [BASE_THEME_VARS.textOnPrimary]: base.textOnPrimary,
    [BASE_THEME_VARS.headingFont]: base.headingFont,
    [BASE_THEME_VARS.bodyFont]: base.bodyFont,
    [BASE_THEME_VARS.mutedText]: base.mutedText,
  }
}

/** Universal bridge plus the Design's namespaced vars (Design wins on clash). */
export function serializeDesignTheme(theme: ResolvedDesignTheme): Record<string, string> {
  return {
    ...serializeBaseTheme(theme.base),
    ...(theme.vars ?? {}),
  }
}
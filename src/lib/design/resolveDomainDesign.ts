// ONE canonical Domain design resolver (P08D-T04-B). Every live path — public
// routes, management shell, Studio bootstrap, token generation — resolves the
// active Design through this single function. Authority order:
//
//   V2 banked config (schemaVersion 2)
//     → V1 structured config (schemaVersion 1)
//     → legacy scalar appearance fields
//     → Design defaults
//
// After this module lands, no live renderer independently reads
// designTemplate / headerLayout / documentStyle as authoritative: the legacy
// axes are DERIVED projections of the resolved config, not inputs (G8).
import type { DesignDefinition, DesignKey } from './types'
import type { LegacyDomainAppearance, ValidationResult } from './contracts'
import { DESIGNS, resolveDesign } from './registry'
import { pickDesignKey, validateDomainDesignConfig } from './config'
import { serializeDesignTheme, type ResolvedDesignTheme } from './themeTokens'
import { parseV2Envelope, resolveBankConfig } from './v2'

export type ResolvedDomainDesign = {
  design: DesignDefinition
  /** Validated config (erased to the Design's own type at dispatch). */
  config: unknown
  configVersion: number
  theme: ResolvedDesignTheme
  cssVars: Record<string, string>
  /** Legacy visual-axes projection for the current Shells/pages (T06/T07 remove it). */
  variant: { headerLayout: string; documentStyle: string }
  diagnostic: string | null
}

/**
 * Project the resolved config to the legacy header/document axes the current
 * Shells and pages still consume. This is the transitional bridge, localized
 * to the dispatcher (P08D-T03-D): per-Design vocabulary → legacy axis strings.
 * T06/T07 replace these props with config-driven rendering.
 */
export function legacyVariantProjection(design: DesignDefinition, config: unknown): { headerLayout: string; documentStyle: string } {
  const shaped = config as { layout?: { header?: unknown }; document?: { treatment?: unknown }; masthead?: { treatment?: unknown } }
  const documentStyle = shaped?.document?.treatment
  switch (design.key) {
    case 'civic': {
      const header = shaped?.layout?.header
      const headerLayout = header === 'compact' ? 'left-aligned' : header === 'banner' ? 'banner-forward' : 'centered'
      return { headerLayout, documentStyle: documentStyle === 'modern' ? 'modern' : 'classic' }
    }
    case 'ledger':
      // Ledger's own rail/masthead vocabulary becomes real presentation in
      // T07; until then the legacy frame keeps its default header posture.
      return { headerLayout: 'centered', documentStyle: documentStyle === 'docket' ? 'modern' : 'classic' }
    case 'poster':
      return { headerLayout: 'centered', documentStyle: documentStyle === 'brief' ? 'modern' : 'classic' }
    default:
      // Total by construction: a Design with no legacy projection (e.g. a
      // test-only foreign Design) still previews on the neutral posture.
      return { headerLayout: 'centered', documentStyle: 'classic' }
  }
}

function finalize(design: DesignDefinition, config: unknown, configVersion: number, diagnostic: string | null): ResolvedDomainDesign {
  const theme = design.config.resolveTheme(config as Parameters<typeof design.config.resolveTheme>[0])
  return {
    design,
    config,
    configVersion,
    theme,
    cssVars: serializeDesignTheme(theme),
    variant: legacyVariantProjection(design, config),
    diagnostic,
  }
}

/**
 * Resolve the active Design + validated config + theme for a Domain's stored
 * appearance. Pure — takes the stored fields, never the database. Unknown
 * active keys fall back to Civic; missing/invalid banks fall back to Design
 * defaults with a surfaced diagnostic; unknown persisted banks are preserved
 * but never executed.
 */
export function resolveDomainDesign(appearance: LegacyDomainAppearance): ResolvedDomainDesign {
  // 1. V2 envelope first.
  const v2 = parseV2Envelope(appearance.designConfig)
  if (v2) {
    // 4-5. registered active Design; unknown active key → Civic.
    const activeKey = pickDesignKey(v2.activeDesign)
    const design = DESIGNS[activeKey]
    // 6-10. select bank; missing → defaults; migrate; validate; invalid → defaults.
    const bank = v2.settingsByDesign[activeKey]
    const resolved = resolveBankConfig(design, bank)
    return finalize(design, resolved.config, resolved.version, resolved.diagnostic)
  }

  // 2-3. V1 structured config, then legacy scalar appearance.
  const storedV1 = validateDomainDesignConfig(appearance.designConfig)
  const designKey: DesignKey = storedV1 ? pickDesignKey(storedV1.designKey) : pickDesignKey(appearance.designTemplate)
  const design = resolveDesign(designKey)

  // Flatten V1 common/options over the legacy scalars into one appearance
  // context so the Design's own fromLegacy owns the vocabulary mapping.
  const legacyContext: LegacyDomainAppearance = {
    ...appearance,
    ...(storedV1 ? {
      primaryColor: storedV1.common.primaryColor,
      secondaryColor: storedV1.common.secondaryColor,
      accentColor: storedV1.common.accentColor,
      backgroundColor: storedV1.common.backgroundColor,
      headingFontKey: storedV1.common.headingFontKey,
      bodyFontKey: storedV1.common.bodyFontKey,
      ...(storedV1.common.contentWidth ? { contentWidth: storedV1.common.contentWidth } : {}),
      headerLayout: storedV1.options.headerLayout ?? appearance.headerLayout,
      documentStyle: storedV1.options.documentStyle ?? appearance.documentStyle,
    } : {}),
  }
  const adapted = design.config.fromLegacy?.(legacyContext) ?? design.config.defaults
  const validated: ValidationResult<unknown> = design.config.validate(adapted)
  return finalize(design, validated.ok ? validated.value : design.config.defaults, design.config.version, validated.ok ? null : 'legacy adaptation failed validation; using defaults')
}
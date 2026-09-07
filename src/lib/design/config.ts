import type { DesignDefinition, DesignKey, DesignThemeDefaults } from './types'

/**
 * Versioned, structured Domain design configuration. Long-term persistence
 * target (spec §20); for now the resolver constructs it from legacy scalar
 * appearance fields. Never a junk drawer — every field is validated.
 */
export type DomainDesignConfig = {
  schemaVersion: 1

  designKey: DesignKey

  common: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    headingFontKey: string
    bodyFontKey: string
    contentWidth?: string
  }

  options: {
    headerLayout?: string
    documentStyle?: string
  }

  design: Record<string, unknown>
}

const DESIGN_KEYS = ['civic', 'ledger', 'poster'] as const

/** Pick a supported design key from persisted raw value, defaulting to Civic. */
export function pickDesignKey(value: unknown): DesignKey {
  return DESIGN_KEYS.includes(value as DesignKey) ? (value as DesignKey) : 'civic'
}

/** Pick a supported option from a Design's own list, defaulting to its default. */
export function pickDesignOption(design: DesignDefinition, axis: 'headerLayout' | 'documentStyle', value: unknown): string {
  const options = axis === 'headerLayout' ? design.theme.headerLayouts : design.theme.documentStyles
  const defaultValue = axis === 'headerLayout' ? design.theme.defaultHeaderLayout : design.theme.defaultDocumentStyle
  return typeof value === 'string' && options.some((option) => option.key === value) ? value : defaultValue
}

type LegacyDomainAppearance = {
  designTemplate?: unknown
  headerLayout?: unknown
  documentStyle?: unknown
  primaryColor?: unknown
  secondaryColor?: unknown
  accentColor?: unknown
  backgroundColor?: unknown
  headingFontKey?: unknown
  bodyFontKey?: unknown
  contentWidth?: unknown
  designConfig?: unknown
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/**
 * Validate a persisted structured Design config (spec §20.3). Returns the
 * validated config or null when it is absent/invalid — callers fall back to
 * legacy scalars, never to a half-parsed object. No CSS/JS/React can pass:
 * every field is a constrained scalar or a plain record.
 */
export function validateDomainDesignConfig(value: unknown): DomainDesignConfig | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.schemaVersion !== 1) return null
  if (!isDesignKeyLike(raw.designKey)) return null
  const common = raw.common
  if (!common || typeof common !== 'object') return null
  const palette = common as Record<string, unknown>
  for (const key of ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor'] as const) {
    if (typeof palette[key] !== 'string' || !HEX_COLOR.test(palette[key] as string)) return null
  }
  for (const key of ['headingFontKey', 'bodyFontKey'] as const) {
    if (typeof palette[key] !== 'string' || (palette[key] as string).length === 0) return null
  }
  if (palette.contentWidth !== undefined && typeof palette.contentWidth !== 'string') return null
  const options = raw.options
  if (options !== undefined && (options === null || typeof options !== 'object')) return null
  const optionRecord = (options ?? {}) as Record<string, unknown>
  if (optionRecord.headerLayout !== undefined && typeof optionRecord.headerLayout !== 'string') return null
  if (optionRecord.documentStyle !== undefined && typeof optionRecord.documentStyle !== 'string') return null
  if (raw.design !== undefined && (raw.design === null || typeof raw.design !== 'object' || Array.isArray(raw.design))) return null
  return {
    schemaVersion: 1,
    designKey: raw.designKey as DomainDesignConfig['designKey'],
    common: {
      primaryColor: palette.primaryColor as string,
      secondaryColor: palette.secondaryColor as string,
      accentColor: palette.accentColor as string,
      backgroundColor: palette.backgroundColor as string,
      headingFontKey: palette.headingFontKey as string,
      bodyFontKey: palette.bodyFontKey as string,
      ...(typeof palette.contentWidth === 'string' ? { contentWidth: palette.contentWidth } : {}),
    },
    options: {
      ...(typeof optionRecord.headerLayout === 'string' ? { headerLayout: optionRecord.headerLayout } : {}),
      ...(typeof optionRecord.documentStyle === 'string' ? { documentStyle: optionRecord.documentStyle } : {}),
    },
    design: (raw.design ?? {}) as Record<string, unknown>,
  }
}

function isDesignKeyLike(value: unknown): value is DomainDesignConfig['designKey'] {
  return value === 'civic' || value === 'ledger' || value === 'poster'
}

/**
 * Compatibility resolver (spec §21 Step 1): construct the effective structured
 * Design config. Order: valid persisted JSON config first, legacy scalar
 * fields second, Design defaults last. No behavior change for existing
 * Domains: pre-migration rows carry no JSON and resolve exactly as before.
 */
export function resolveEffectiveDomainDesign(
  design: DesignDefinition,
  domain: LegacyDomainAppearance,
): DomainDesignConfig {
  const stored = validateDomainDesignConfig(domain.designConfig)
  const storedKey = stored ? pickDesignKey(stored.designKey) : null
  // A stored config names its own Design; the passed Design is the resolved
  // one, so axis options validate against it either way.
  const designKey = storedKey ?? pickDesignKey(domain.designTemplate)
  const headerLayout = pickDesignOption(design, 'headerLayout', stored?.options.headerLayout ?? domain.headerLayout)
  const documentStyle = pickDesignOption(design, 'documentStyle', stored?.options.documentStyle ?? domain.documentStyle)
  const common = stored?.common
  return {
    schemaVersion: 1,
    designKey,
    common: {
      primaryColor: common?.primaryColor ?? (typeof domain.primaryColor === 'string' ? domain.primaryColor : design.theme.defaults.primary),
      secondaryColor: common?.secondaryColor ?? (typeof domain.secondaryColor === 'string' ? domain.secondaryColor : design.theme.defaults.secondary),
      accentColor: common?.accentColor ?? (typeof domain.accentColor === 'string' ? domain.accentColor : design.theme.defaults.accent),
      backgroundColor: common?.backgroundColor ?? (typeof domain.backgroundColor === 'string' ? domain.backgroundColor : design.theme.defaults.background),
      headingFontKey: common?.headingFontKey ?? (typeof domain.headingFontKey === 'string' ? domain.headingFontKey : design.theme.defaults.headingFontKey),
      bodyFontKey: common?.bodyFontKey ?? (typeof domain.bodyFontKey === 'string' ? domain.bodyFontKey : design.theme.defaults.bodyFontKey),
      ...((common?.contentWidth ?? (typeof domain.contentWidth === 'string' ? domain.contentWidth : undefined)) !== undefined
        ? { contentWidth: (common?.contentWidth ?? domain.contentWidth) as string }
        : {}),
    },
    options: { headerLayout, documentStyle },
    design: stored?.design ?? {},
  }
}

/** Effective option value for a Design axis, with safe default fallback. */
export function resolveHeaderLayout(design: DesignDefinition, domain: LegacyDomainAppearance): string {
  return pickDesignOption(design, 'headerLayout', domain.headerLayout)
}

export function resolveDocumentStyle(design: DesignDefinition, domain: LegacyDomainAppearance): string {
  return pickDesignOption(design, 'documentStyle', domain.documentStyle)
}

/** Theme Studio needs the Design's curated defaults for a pristine configuration. */
export function designThemeDefaults(design: DesignDefinition): DesignThemeDefaults {
  return { ...design.theme.defaults }
}
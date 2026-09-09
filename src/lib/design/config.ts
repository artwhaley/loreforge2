import { DEFAULT_DESIGN_KEY, isDesignKey, type DesignKey } from './types'
import type { LegacyDomainAppearance } from './contracts'

/**
 * Versioned, structured Domain design configuration. Long-term persistence
 * target (spec §20); for now the resolver constructs it from legacy scalar
 * appearance fields. Never a junk drawer — every field is validated.
 * P08D-T03/T04: this V1 envelope is being superseded by per-Design banked V2
 * config; it remains the compatibility resolution path until T04 lands.
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

/** Pick a supported design key from persisted raw value, defaulting to the host default Design. */
export function pickDesignKey(value: unknown): DesignKey {
  return isDesignKey(value) ? value : DEFAULT_DESIGN_KEY
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
  if (!isDesignKey(raw.designKey)) return null
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

/**
 * Effective option value for a Design axis, with safe default fallback. The
 * universal legacy axes are derived projections of the resolved config
 * (`legacyVariantProjection` in the resolver); persisted legacy scalars are
 * adapted by each Design's own `fromLegacy`. Unknown stored values fall back
 * to the structural projection defaults.
 */
export function resolveHeaderLayout(_design: unknown, domain: LegacyDomainAppearance): string {
  return domain.headerLayout === 'banner-forward' ? 'banner-forward' : domain.headerLayout === 'left-aligned' ? 'left-aligned' : 'centered'
}

export function resolveDocumentStyle(_design: unknown, domain: LegacyDomainAppearance): string {
  return domain.documentStyle === 'modern' ? 'modern' : 'classic'
}

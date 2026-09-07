import type { ComponentType } from 'react'

import type { AboutPageModel } from '@/lib/page-models/info'
import type { LorePageModel } from '@/lib/page-models/info'
import type { DepartmentsPageModel, DepartmentPageModel } from '@/lib/page-models/departments'
import type { DocumentPageModel } from '@/lib/page-models/document'
import type { HomePageModel } from '@/lib/page-models/home'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DomainShellModel } from '@/lib/page-models/shell'
import type {
  DesignStatus,
  DesignStudioEditorProps,
  LegacyDomainAppearance,
  ValidationResult,
} from './contracts'

export type DesignKey = 'civic' | 'ledger' | 'poster'

/** A curated presentational option on a legacy visual axis (transition only). */
export type DesignOption = {
  key: string
  label: string
  description?: string
}

/** Theme Studio control descriptor — legacy schema era (transition only). */
export type ThemeControlDefinition =
  | { kind: 'select'; key: string; label: string; options: DesignOption[]; defaultValue: string }
  | { kind: 'toggle'; key: string; label: string; defaultValue: boolean }
  | { kind: 'text'; key: string; label: string; defaultValue: string }

/** Curated values meaningful across nearly all Designs (legacy token contract). */
export type DesignThemeDefaults = {
  primary: string
  secondary: string
  accent: string
  background: string
  headingFontKey: string
  bodyFontKey: string
  contentWidth?: string
}

/**
 * Legacy universal theme-axes block (03_TARGET_CONTRACTS: "theme terminology"
 * section). Kept ONLY for the transition so the current studio/resolver still
 * renders before T04/V2 resolution and T06/T07 isolation land. First-class
 * Designs own their vocabulary in `config`; a new Design must not declare
 * these axes to earn status.
 */
export type LegacyDesignTheme = {
  defaults: DesignThemeDefaults
  headerLayouts: readonly DesignOption[]
  defaultHeaderLayout: string
  documentStyles: readonly DesignOption[]
  defaultDocumentStyle: string
  controls: readonly ThemeControlDefinition[]
  validate(config: unknown): unknown
}

/**
 * A source-controlled first-party LoreForge Design. Static, no plugin loader,
 * no arbitrary registration. Each Design owns its Shell DOM, pages, SCSS,
 * config vocabulary/validation/migration/theme resolution, Studio editor, and
 * status. `TConfig` is the Design's own config type; the registry erases it
 * at the dispatch boundary (localized type erasure — routes never see `any`).
 */
export type DesignDefinition<TConfig extends object = object> = {
  key: DesignKey
  status: DesignStatus
  name: string
  description: string

  preview: {
    thumbnail: string
  }

  config: {
    version: number
    defaults: TConfig
    validate(raw: unknown): ValidationResult<TConfig>
    migrate(fromVersion: number, raw: unknown): ValidationResult<TConfig>
    fromLegacy?: (legacy: LegacyDomainAppearance) => TConfig
    resolveTheme(config: TConfig): {
      base: {
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
      vars?: Record<string, string>
    }
  }

  studio: {
    Editor: ComponentType<DesignStudioEditorProps<TConfig>>
  }

  Shell: ComponentType<DesignShellProps>

  pages: {
    home: ComponentType<HomePageModel & DesignVariantProps>
    records: ComponentType<RecordsDesignViewProps>
    document: ComponentType<DocumentDesignViewProps & DesignVariantProps>
    departments: ComponentType<DepartmentsPageModel & DesignVariantProps>
    department: ComponentType<DepartmentPageModel & DesignVariantProps>
    about: ComponentType<AboutPageModel & DesignVariantProps>
    lore: ComponentType<LorePageModel & DesignVariantProps>
  }

  /** Transitional legacy visual-axes block; replaced by `config` (T04+). */
  legacyTheme?: LegacyDesignTheme
}

/** Design-owned visual-axes options supplied by the resolver (legacy transition). */
export type DesignVariantProps = {
  headerLayout: string
  documentStyle: string
}

/** Shell receives the authorized model plus the resolved theme/variant tokens. */
export type DesignShellProps = {
  model: DomainShellModel
  theme: {
    tokens: Record<string, string>
    headerLayout: string
    documentStyle: string
  }
  children: React.ReactNode
}

/**
 * Records is explicitly interactive: each Design's Records entrypoint is a
 * client component that consumes the shared workspace behavior over the model.
 */
export type RecordsDesignViewProps = RecordsPageModel

/**
 * Document reading views stay server-renderable (spec §14.3): the route
 * passes its real server-action bridge as props, and Theme Studio's live
 * client preview passes inert stubs. A client-context hook cannot serve the
 * server-rendered path, so the actions cross as serializable props.
 */
export type DocumentDesignViewProps = DocumentPageModel & {
  workflowAction?: ((formData: FormData) => void | Promise<void>) | null
  deleteAction?: ((formData: FormData) => void | Promise<void>) | null
}

export function isDesignKey(value: unknown): value is DesignKey {
  return value === 'civic' || value === 'ledger' || value === 'poster'
}
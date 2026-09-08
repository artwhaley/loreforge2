import type { ComponentType } from 'react'

import type { AboutPageModel } from '@/lib/page-models/info'
import type { LorePageModel } from '@/lib/page-models/info'
import type { DepartmentsPageModel, DepartmentPageModel } from '@/lib/page-models/departments'
import type { DocumentPageModel } from '@/lib/page-models/document'
import type { HomePageModel } from '@/lib/page-models/home'
import type { MembersPageModel } from '@/lib/page-models/members'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DomainShellModel } from '@/lib/page-models/shell'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { WorkPageModel } from '@/lib/page-models/management/work'
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
    /**
     * Operational slots (OBSIDIAN-T01). OPTIONAL until T08 flips them to
     * required; see the frozen requiredness ladder in the patch spec §5.1.
     * `work` is intentionally not nested under `management`: ordinary
     * authorized approvers may use it without being Domain administrators.
     * `members` is a public directory slot (patched packet, OBSIDIAN-T00).
     */
    work?: ComponentType<WorkPageModel & DesignVariantProps>
    members?: ComponentType<MembersPageModel & DesignVariantProps>
    management?: {
      departments?: ComponentType<DepartmentsManagementPageModel & DesignVariantProps>
      folders?: ComponentType<FolderManagementPageModel & DesignVariantProps>
      roles?: ComponentType<RoleManagementPageModel & DesignVariantProps>
      documentTypes?: ComponentType<DocumentTypesManagementPageModel & DesignVariantProps>
      people?: ComponentType<PeopleManagementPageModel & DesignVariantProps>
      person?: ComponentType<PersonManagementPageModel & DesignVariantProps>
      invitations?: ComponentType<InvitationsManagementPageModel & DesignVariantProps>
    }
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
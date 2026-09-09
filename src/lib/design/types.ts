import type { ComponentType } from 'react'

import type { AboutPageModel } from '@/lib/page-models/info'
import type { LorePageModel } from '@/lib/page-models/info'
import type { CharacterProfilePageModel } from '@/lib/page-models/characterProfile'
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

export { DEFAULT_DESIGN_KEY, DESIGN_KEYS, isDesignKey } from './generated/designKeys'
export type { DesignKey } from './generated/designKeys'
import type { DesignKey } from './generated/designKeys'

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

  Shell: ComponentType<DesignShellProps<TConfig>>

  pages: {
    home: ComponentType<HomePageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    records: ComponentType<RecordsDesignViewProps & DesignConfigProps<TConfig>>
    document: ComponentType<DocumentDesignViewProps & DesignVariantProps & DesignConfigProps<TConfig>>
    departments: ComponentType<DepartmentsPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    department: ComponentType<DepartmentPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    about: ComponentType<AboutPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    lore: ComponentType<LorePageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    /**
     * Operational slots (OBSIDIAN-T08). REQUIRED for every Design — first-
     * class Designs own real operational bodies; the Poster compatibility
     * Design declares compatibility renderers (its `status` marks the
     * difference, never the slot shape). `work` is intentionally not nested
     * under `management`: ordinary authorized approvers may use it without
     * being Domain administrators. `members` is a public directory slot
     * (patched packet, OBSIDIAN-T00).
     */
    work: ComponentType<WorkDesignViewProps & DesignVariantProps & DesignConfigProps<TConfig>>
    members: ComponentType<MembersPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    /**
     * OPTIONAL public character-profile surface (OBSIDIAN-T11). A Design that
     * implements it owns `/characters/[id]`; a Design that omits it receives
     * the route's Design-neutral fallback. Optional slots never affect
     * requiredness: REQUIRED_DESIGN_SLOTS stays the 16 Class A surfaces.
     */
    characterProfile?: ComponentType<CharacterProfilePageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    management: {
      departments: ComponentType<DepartmentsManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
      folders: ComponentType<FolderManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
      roles: ComponentType<RoleManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
      documentTypes: ComponentType<DocumentTypesManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
      people: ComponentType<PeopleManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
      person: ComponentType<PersonManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
      invitations: ComponentType<InvitationsManagementPageModel & DesignVariantProps & DesignConfigProps<TConfig>>
    }
  }

}

/** Design-owned visual-axes options supplied by the resolver (legacy transition). */
export type DesignVariantProps = {
  headerLayout: string
  documentStyle: string
}

/**
 * The validated active Design config, propagated generically (OBSIDIAN-T02).
 * Routes and the Site Studio preview hand the already-validated config to
 * Shells and page renderers; config erasure stays localized to the registry/
 * dispatch boundary. The Studio preview passes the DRAFT config so edits
 * render before Save; saved-config fallback never reaches a renderer invalid.
 */
export type DesignConfigProps<TConfig extends object> = {
  designConfig: TConfig
}

/** Shell receives the authorized model, resolved theme/variant tokens, and the validated config. */
export type DesignShellProps<TConfig extends object = object> = {
  model: DomainShellModel
  theme: {
    tokens: Record<string, string>
    headerLayout: string
    documentStyle: string
  }
  designConfig: TConfig
  children: React.ReactNode
}

/**
 * Work actions cross as server-action bridges (OBSIDIAN-T07/T08): the route
 * hands its real approve/reject server actions to the selected Design's Work
 * entrypoint as props, so Designs never import the workflow module directly
 * and every submission re-authorizes server-side.
 */
export type WorkDesignViewProps = WorkPageModel & {
  approveAction: (formData: FormData) => void | Promise<void>
  rejectAction: (formData: FormData) => void | Promise<void>
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

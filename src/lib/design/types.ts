import type { ComponentType } from 'react'

import type { AboutPageModel } from '@/lib/page-models/info'
import type { LorePageModel } from '@/lib/page-models/info'
import type { DepartmentsPageModel, DepartmentPageModel } from '@/lib/page-models/departments'
import type { DocumentPageModel } from '@/lib/page-models/document'
import type { HomePageModel } from '@/lib/page-models/home'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DomainShellModel } from '@/lib/page-models/shell'

export type DesignKey = 'civic' | 'ledger' | 'poster'

/** A curated presentational option on a Design-owned visual axis (header layout, document style). */
export type DesignOption = {
  key: string
  label: string
  description?: string
}

/** Theme Studio control descriptor — the Design's own schema, not a global switch. */
export type ThemeControlDefinition =
  | { kind: 'select'; key: string; label: string; options: DesignOption[]; defaultValue: string }
  | { kind: 'toggle'; key: string; label: string; defaultValue: boolean }
  | { kind: 'text'; key: string; label: string; defaultValue: string }

/** Curated values meaningful across nearly all Designs (mirrors the theme token contract). */
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
 * A source-controlled first-party LoreForge Design. Static, no plugin loader,
 * no arbitrary registration. Design components consume plain Page Models; they
 * must not import protected data/auth modules.
 */
export type DesignDefinition<TDesignConfig = unknown> = {
  key: DesignKey
  name: string
  description: string

  preview: {
    thumbnail: string
  }

  Shell: ComponentType<DesignShellProps>

  pages: {
    home: ComponentType<HomePageModel & DesignVariantProps>
    records: ComponentType<RecordsDesignViewProps>
    document: ComponentType<DocumentPageModel & DesignVariantProps>
    departments: ComponentType<DepartmentsPageModel & DesignVariantProps>
    department: ComponentType<DepartmentPageModel & DesignVariantProps>
    about: ComponentType<AboutPageModel & DesignVariantProps>
    lore: ComponentType<LorePageModel & DesignVariantProps>
  }

  theme: {
    defaults: DesignThemeDefaults

    headerLayouts: readonly DesignOption[]
    defaultHeaderLayout: string

    documentStyles: readonly DesignOption[]
    defaultDocumentStyle: string

    controls: readonly ThemeControlDefinition[]

    validate(config: unknown): TDesignConfig
  }
}

/** Design-owned visual-axes options supplied by the resolver to every view. */
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

export function isDesignKey(value: unknown): value is DesignKey {
  return value === 'civic' || value === 'ledger' || value === 'poster'
}
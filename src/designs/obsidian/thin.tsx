import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { HomePageModel } from '@/lib/page-models/home'
import type { DocumentDesignViewProps, DesignVariantProps } from '@/lib/design/types'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { ObsidianConfigV1 } from '@/lib/design/contracts'
import type { DesignConfigProps } from '@/lib/design/types'

import { ObsidianHome } from './ObsidianHome'
import { ObsidianAbout } from './ObsidianAbout'
import { ObsidianDepartments } from './ObsidianDepartments'
import { ObsidianDepartmentDetail } from './ObsidianDepartmentDetail'

/**
 * Obsidian thin-page adapters (OBSIDIAN-T11). The ported components keep
 * their incubation prop shapes; these thin wrappers adapt the production
 * slot props (model + variant + config) onto them, so the Design definition
 * stays type-honest — no casts. T13/T14 refine these when the Lore model
 * expands and the atmosphere asset wiring lands.
 */

export function ObsidianHomeView(model: HomePageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianHome model={model} atmosphereImage={null} />
}

export function ObsidianAboutView(model: AboutPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianAbout model={model} />
}

export function ObsidianLoreView(_model: LorePageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  // The production Lore model has no entries yet (T14 expands it); render the
  // About composition's public-page frame with the canonical Lore heading.
  return (
    <div>
      <h1>Lore</h1>
    </div>
  )
}

export function ObsidianDepartmentsView(model: DepartmentsPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianDepartments model={model} />
}

export function ObsidianDepartmentView(model: DepartmentPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianDepartmentDetail model={model} />
}

export type { DocumentDesignViewProps }
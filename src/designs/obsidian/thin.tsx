import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { HomePageModel } from '@/lib/page-models/home'
import type { DocumentDesignViewProps, DesignVariantProps } from '@/lib/design/types'
import type { ObsidianConfigV1 } from '@/lib/design/contracts'
import type { DesignConfigProps } from '@/lib/design/types'

import { ObsidianHome } from './ObsidianHome'
import { ObsidianAbout } from './ObsidianAbout'
import { ObsidianDepartments } from './ObsidianDepartments'
import { ObsidianDepartmentDetail } from './ObsidianDepartmentDetail'
import { ObsidianLore } from './ObsidianLore'

/**
 * Obsidian thin-page adapters (OBSIDIAN-T11). The ported components keep
 * their incubation prop shapes; these thin wrappers adapt the production
 * slot props (model + variant + config) onto them, so the Design definition
 * stays type-honest — no casts. T13/T14 refine these when the Lore model
 * expands and the atmosphere asset wiring lands.
 */

export function ObsidianHomeView(model: HomePageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianHome model={model} atmosphereImage={model.designConfig.atmosphere?.url ?? null} />
}

export function ObsidianAboutView(model: AboutPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianAbout model={model} />
}

export function ObsidianLoreView(model: LorePageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianLore
    model={{
      baseUrl: model.baseUrl,
      introduction: 'Published pages that belong to this Domain, gathered as a living guide.',
      entries: model.entries.map((entry) => ({
        title: entry.title,
        slug: entry.slug,
        group: entry.group,
        summary: entry.summary,
        updatedLabel: entry.revisionLabel,
        bodyHtml: entry.bodyHtml,
      })),
    }}
  />
}

export function ObsidianDepartmentsView(model: DepartmentsPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianDepartments model={model} />
}

export function ObsidianDepartmentView(model: DepartmentPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianDepartmentDetail model={model} />
}

export type { DocumentDesignViewProps }

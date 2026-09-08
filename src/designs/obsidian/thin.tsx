import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { HomePageModel } from '@/lib/page-models/home'
import type { DocumentDesignViewProps, DesignVariantProps } from '@/lib/design/types'
import type { ObsidianConfigV1 } from './config'
import { bundledDesignAssetUrl } from '@/lib/design/assets'
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
  const atmosphereImage = model.designConfig.atmosphere?.url ?? bundledDesignAssetUrl('obsidian', 'assets/atmosphere.png')
  const atmosphereCaption = `THE ARCHIVE AT ${model.domain.name.toUpperCase()}`
  return <ObsidianHome model={model} atmosphereImage={atmosphereImage} atmosphereCaption={atmosphereCaption} />
}

export function ObsidianAboutView(model: AboutPageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianAbout model={model} />
}

export function ObsidianLoreView(model: LorePageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  return <ObsidianLore
    model={{
      baseUrl: model.baseUrl,
      domainName: model.domainName,
      introduction: 'A growing field guide to the places, customs, and tensions that shape life at the edge of the known sea. Start anywhere; each entry is a door into the shared world.',
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

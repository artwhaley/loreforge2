import type { DesignDefinition } from '@/lib/design/types'
import type { ObsidianConfigV1 } from '@/lib/design/contracts'
import { ObsidianShell } from './ObsidianShell'
import { ObsidianRecords } from './ObsidianRecords'
import { ObsidianDocument } from './ObsidianDocument'
import { ObsidianStudioEditor } from './studio/ObsidianStudioEditor'
import { ObsidianAboutView, ObsidianDepartmentView, ObsidianDepartmentsView, ObsidianHomeView, ObsidianLoreView } from './thin'
import { ObsidianDepartments as ObsidianDepartmentsManagement, ObsidianDocumentTypes, ObsidianFolders, ObsidianInvitations, ObsidianMembers, ObsidianPeople, ObsidianPerson, ObsidianRoles, ObsidianWork } from './operational'
import { migrateObsidianConfig, obsidianDefaults, obsidianFromLegacy, resolveObsidianTheme, validateObsidianConfig } from './config'

/**
 * Obsidian Design definition (OBSIDIAN-T11). Registered with status
 * 'compatibility' — it flips to first-class only at T19's full conformance
 * pass. The slot bodies are type-honest adapters over the ported components;
 * no casts.
 */
export const obsidian: DesignDefinition<ObsidianConfigV1> = {
  key: 'obsidian',
  status: 'compatibility',
  name: 'Obsidian',
  description: 'A night-harbour world: dark atmospheric surfaces, luminous accents, cinematic records.',
  preview: { thumbnail: '/designs/obsidian.svg' },
  config: {
    version: 1,
    defaults: obsidianDefaults,
    validate: validateObsidianConfig,
    migrate: migrateObsidianConfig,
    fromLegacy: obsidianFromLegacy,
    resolveTheme: resolveObsidianTheme,
  },
  studio: { Editor: ObsidianStudioEditor },
  Shell: ObsidianShell,
  pages: {
    home: ObsidianHomeView,
    records: ObsidianRecords,
    document: ObsidianDocument,
    departments: ObsidianDepartmentsView,
    department: ObsidianDepartmentView,
    about: ObsidianAboutView,
    lore: ObsidianLoreView,
    work: ObsidianWork,
    members: ObsidianMembers,
    management: {
      departments: ObsidianDepartmentsManagement,
      folders: ObsidianFolders,
      roles: ObsidianRoles,
      documentTypes: ObsidianDocumentTypes,
      people: ObsidianPeople,
      person: ObsidianPerson,
      invitations: ObsidianInvitations,
    },
  },
}

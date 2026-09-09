import type { DesignDefinition } from '@/lib/design/types'
import type { CivicConfigV1 } from './config'
import { CivicAboutView, CivicDepartmentView, CivicDepartmentsView, CivicLoreView } from './thin'
import { CivicShell } from './CivicShell'
import { CivicHome } from './CivicHome'
import { CivicRecords } from './CivicRecords'
import { CivicDocument } from './CivicDocument'
import { CivicDepartments, CivicDocumentTypes, CivicFolders, CivicInvitations, CivicMembers, CivicPeople, CivicPerson, CivicRoles, CivicWork } from './operational'
import { civicDefaults, civicFromLegacy, migrateCivicConfig, resolveCivicTheme, validateCivicConfig } from './config'
import { CivicStudioEditor } from './studio/CivicStudioEditor'

export const civic: DesignDefinition<CivicConfigV1> = {
  key: 'civic',
  status: 'first-class',
  name: 'Civic',
  description: 'A classic institutional portal: composed masthead, clear directory, structured record grid.',
  preview: { thumbnail: '/design-assets/civic/thumbnail.svg' },
  config: {
    version: 1,
    defaults: civicDefaults,
    validate: validateCivicConfig,
    migrate: migrateCivicConfig,
    fromLegacy: civicFromLegacy,
    resolveTheme: resolveCivicTheme,
  },
  studio: { Editor: CivicStudioEditor },
  Shell: CivicShell,
  pages: {
    home: CivicHome,
    records: CivicRecords,
    document: CivicDocument,
    departments: CivicDepartmentsView,
    department: CivicDepartmentView,
    about: CivicAboutView,
    lore: CivicLoreView,
    work: CivicWork,
    members: CivicMembers,
    management: {
      departments: CivicDepartments,
      folders: CivicFolders,
      roles: CivicRoles,
      documentTypes: CivicDocumentTypes,
      people: CivicPeople,
      person: CivicPerson,
      invitations: CivicInvitations,
    },
  },
}

export default civic

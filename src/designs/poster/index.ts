import type { DesignDefinition } from '@/lib/design/types'
import type { PosterConfigV1 } from './config'
import { HEADER_LAYOUTS, DOCUMENT_STYLES, THEME_PRESETS } from '@/lib/theme/fonts'
import { LegacyAboutView, LegacyDepartmentView, LegacyDepartmentsView, LegacyLoreView } from '../shared/legacy-thin'
import { PosterShell } from './PosterShell'
import { PosterHome } from './PosterHome'
import { PosterRecords } from './PosterRecords'
import { PosterDocument } from './PosterDocument'
import { PosterDepartments, PosterDocumentTypes, PosterFolders, PosterInvitations, PosterMembers, PosterPeople, PosterPerson, PosterRoles, PosterWork } from './operational'
import { migratePosterConfig, posterDefaults, posterFromLegacy, resolvePosterTheme, validatePosterConfig } from './config'
import { PosterStudioEditor } from './studio/PosterStudioEditor'

const modern = THEME_PRESETS.modern

export const poster: DesignDefinition<PosterConfigV1> = {
  key: 'poster',
  status: 'compatibility',
  name: 'Poster',
  description: 'A cultural publication: monumental type, asymmetric compositions, graphic destination tiles.',
  preview: { thumbnail: '/design-assets/poster/thumbnail.svg' },
  config: {
    version: 1,
    defaults: posterDefaults,
    validate: validatePosterConfig,
    migrate: migratePosterConfig,
    fromLegacy: posterFromLegacy,
    resolveTheme: resolvePosterTheme,
  },
  studio: { Editor: PosterStudioEditor },
  Shell: PosterShell,
  pages: {
    home: PosterHome,
    records: PosterRecords,
    document: PosterDocument,
    departments: LegacyDepartmentsView,
    department: LegacyDepartmentView,
    about: LegacyAboutView,
    lore: LegacyLoreView,
    work: PosterWork,
    members: PosterMembers,
    management: {
      departments: PosterDepartments,
      folders: PosterFolders,
      roles: PosterRoles,
      documentTypes: PosterDocumentTypes,
      people: PosterPeople,
      person: PosterPerson,
      invitations: PosterInvitations,
    },
  },
  legacyTheme: {
    defaults: { primary: modern.primary, secondary: modern.secondary, accent: modern.accent, background: modern.background, headingFontKey: modern.headingFontKey, bodyFontKey: modern.bodyFontKey, contentWidth: 'standard' },
    headerLayouts: [
      { key: 'centered', label: HEADER_LAYOUTS.centered.label },
      { key: 'left-aligned', label: HEADER_LAYOUTS['left-aligned'].label },
      { key: 'banner-forward', label: HEADER_LAYOUTS['banner-forward'].label },
    ],
    defaultHeaderLayout: 'centered',
    documentStyles: [
      { key: 'classic', label: DOCUMENT_STYLES.classic.label },
      { key: 'modern', label: DOCUMENT_STYLES.modern.label },
    ],
    defaultDocumentStyle: 'classic',
    controls: [],
    validate: () => ({}),
  },
}

export default poster

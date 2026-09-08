import type { DesignDefinition } from '@/lib/design/types'
import type { LedgerConfigV1 } from '@/lib/design/contracts'
import { THEME_PRESETS } from '@/lib/theme/fonts'
import { LedgerAboutView, LedgerDepartmentView, LedgerDepartmentsView, LedgerLoreView } from './thin'
import { LedgerShell } from './LedgerShell'
import { LedgerHome } from './LedgerHome'
import { LedgerRecords } from './LedgerRecords'
import { LedgerDocument } from './LedgerDocument'
import { LedgerDepartments, LedgerDocumentTypes, LedgerFolders, LedgerInvitations, LedgerMembers, LedgerPeople, LedgerPerson, LedgerRoles, LedgerWork } from './operational'
import { ledgerDefaults, ledgerFromLegacy, migrateLedgerConfig, resolveLedgerTheme, validateLedgerConfig } from './config'
import { LedgerStudioEditor } from './studio/LedgerStudioEditor'

const ink = THEME_PRESETS.ink

export const ledger: DesignDefinition<LedgerConfigV1> = {
  key: 'ledger',
  status: 'first-class',
  name: 'Ledger',
  description: 'An editorial archive: persistent side index, generous reading column, ruled register.',
  preview: { thumbnail: '/designs/ledger.svg' },
  config: {
    version: 1,
    defaults: ledgerDefaults,
    validate: validateLedgerConfig,
    migrate: migrateLedgerConfig,
    fromLegacy: ledgerFromLegacy,
    resolveTheme: resolveLedgerTheme,
  },
  studio: { Editor: LedgerStudioEditor },
  Shell: LedgerShell,
  pages: {
    home: LedgerHome,
    records: LedgerRecords,
    document: LedgerDocument,
    departments: LedgerDepartmentsView,
    department: LedgerDepartmentView,
    about: LedgerAboutView,
    lore: LedgerLoreView,
    work: LedgerWork,
    members: LedgerMembers,
    management: {
      departments: LedgerDepartments,
      folders: LedgerFolders,
      roles: LedgerRoles,
      documentTypes: LedgerDocumentTypes,
      people: LedgerPeople,
      person: LedgerPerson,
      invitations: LedgerInvitations,
    },
  },
  legacyTheme: {
    defaults: { primary: ink.primary, secondary: ink.secondary, accent: ink.accent, background: ink.background, headingFontKey: ink.headingFontKey, bodyFontKey: ink.bodyFontKey, contentWidth: 'standard' },
    // Transitional legacy axis labels are inlined here so this first-class
    // Design never imports the legacy constants module (P08D-T08).
    headerLayouts: [
      { key: 'centered', label: 'Centered masthead' },
      { key: 'left-aligned', label: 'Compact bar' },
      { key: 'banner-forward', label: 'Banner hero' },
    ],
    defaultHeaderLayout: 'centered',
    documentStyles: [
      { key: 'classic', label: 'Classic (serif record sheet)' },
      { key: 'modern', label: 'Modern (clean reading)' },
    ],
    defaultDocumentStyle: 'classic',
    controls: [],
    validate: () => ({}),
  },
}

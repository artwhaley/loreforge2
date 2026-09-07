import type { DesignDefinition } from '@/lib/design/types'
import type { LedgerConfigV1 } from '@/lib/design/contracts'
import { HEADER_LAYOUTS, DOCUMENT_STYLES, THEME_PRESETS } from '@/lib/theme/fonts'
import { LedgerAboutView, LedgerDepartmentView, LedgerDepartmentsView, LedgerLoreView } from './thin'
import { LedgerShell } from './LedgerShell'
import { LedgerHome } from './LedgerHome'
import { LedgerRecords } from './LedgerRecords'
import { LedgerDocument } from './LedgerDocument'
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
  },
  legacyTheme: {
    defaults: { primary: ink.primary, secondary: ink.secondary, accent: ink.accent, background: ink.background, headingFontKey: ink.headingFontKey, bodyFontKey: ink.bodyFontKey, contentWidth: 'standard' },
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

import type { DesignDefinition } from '@/lib/design/types'
import { HEADER_LAYOUTS, DOCUMENT_STYLES, THEME_PRESETS } from '@/lib/theme/fonts'
import { SharedAboutView, SharedDepartmentView, SharedDepartmentsView, SharedLoreView } from '../shared/thin'
import { LedgerShell } from './LedgerShell'
import { LedgerHome } from './LedgerHome'
import { LedgerRecords } from './LedgerRecords'
import { LedgerDocument } from './LedgerDocument'

const ink = THEME_PRESETS.ink

export const ledger: DesignDefinition = {
  key: 'ledger',
  name: 'Ledger',
  description: 'An editorial archive: persistent side index, generous reading column, ruled register.',
  preview: { thumbnail: '/designs/ledger.svg' },
  Shell: LedgerShell,
  pages: {
    home: LedgerHome,
    records: LedgerRecords,
    document: LedgerDocument,
    departments: SharedDepartmentsView,
    department: SharedDepartmentView,
    about: SharedAboutView,
    lore: SharedLoreView,
  },
  theme: {
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

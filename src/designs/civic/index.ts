import type { DesignDefinition } from '@/lib/design/types'
import type { CivicConfigV1 } from '@/lib/design/contracts'
import { HEADER_LAYOUTS, DOCUMENT_STYLES, THEME_PRESETS } from '@/lib/theme/fonts'
import { CivicAboutView, CivicDepartmentView, CivicDepartmentsView, CivicLoreView } from './thin'
import { CivicShell } from './CivicShell'
import { CivicHome } from './CivicHome'
import { CivicRecords } from './CivicRecords'
import { CivicDocument } from './CivicDocument'
import { civicDefaults, civicFromLegacy, migrateCivicConfig, resolveCivicTheme, validateCivicConfig } from './config'
import { CivicStudioEditor } from './studio/CivicStudioEditor'

const heritage = THEME_PRESETS.heritage

export const civic: DesignDefinition<CivicConfigV1> = {
  key: 'civic',
  status: 'first-class',
  name: 'Civic',
  description: 'A classic institutional portal: composed masthead, clear directory, structured record grid.',
  preview: { thumbnail: '/designs/civic.svg' },
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
  },
  legacyTheme: {
    defaults: { primary: heritage.primary, secondary: heritage.secondary, accent: heritage.accent, background: heritage.background, headingFontKey: heritage.headingFontKey, bodyFontKey: heritage.bodyFontKey, contentWidth: 'standard' },
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

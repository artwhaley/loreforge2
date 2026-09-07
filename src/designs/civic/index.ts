import type { DesignDefinition } from '@/lib/design/types'
import type { CivicConfigV1 } from '@/lib/design/contracts'
import { THEME_PRESETS } from '@/lib/theme/fonts'
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

import type { DesignDefinition } from '@/lib/design/types'
import { HEADER_LAYOUTS, DOCUMENT_STYLES, THEME_PRESETS } from '@/lib/theme/fonts'
import { SharedAboutView, SharedDepartmentView, SharedDepartmentsView, SharedLoreView } from '../shared/thin'
import { CivicShell } from './CivicShell'
import { CivicHome } from './CivicHome'
import { CivicRecords } from './CivicRecords'
import { CivicDocument } from './CivicDocument'

const heritage = THEME_PRESETS.heritage

export const civic: DesignDefinition = {
  key: 'civic',
  name: 'Civic',
  description: 'A classic institutional portal: composed masthead, clear directory, structured record grid.',
  preview: { thumbnail: '/designs/civic.svg' },
  Shell: CivicShell,
  pages: {
    home: CivicHome,
    records: CivicRecords,
    document: CivicDocument,
    departments: SharedDepartmentsView,
    department: SharedDepartmentView,
    about: SharedAboutView,
    lore: SharedLoreView,
  },
  theme: {
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

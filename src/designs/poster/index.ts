import type { DesignDefinition } from '@/lib/design/types'
import { HEADER_LAYOUTS, DOCUMENT_STYLES, THEME_PRESETS } from '@/lib/theme/fonts'
import { SharedAboutView, SharedDepartmentView, SharedDepartmentsView, SharedLoreView } from '../shared/thin'
import { PosterShell } from './PosterShell'
import { PosterHome } from './PosterHome'
import { PosterRecords } from './PosterRecords'
import { PosterDocument } from './PosterDocument'

const modern = THEME_PRESETS.modern

export const poster: DesignDefinition = {
  key: 'poster',
  name: 'Poster',
  description: 'A cultural publication: monumental type, asymmetric compositions, graphic destination tiles.',
  preview: { thumbnail: '/designs/poster.svg' },
  Shell: PosterShell,
  pages: {
    home: PosterHome,
    records: PosterRecords,
    document: PosterDocument,
    departments: SharedDepartmentsView,
    department: SharedDepartmentView,
    about: SharedAboutView,
    lore: SharedLoreView,
  },
  theme: {
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

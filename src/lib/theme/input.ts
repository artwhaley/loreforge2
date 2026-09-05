import {
  BACKGROUND_TREATMENTS,
  CONTENT_WIDTHS,
  DESIGN_TEMPLATES,
  DOCUMENT_STYLES,
  FONT_OPTIONS,
  HEADER_LAYOUTS,
  THEME_PRESETS,
} from './fonts'

export type ThemeInput = {
  preset: keyof typeof THEME_PRESETS
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
  designTemplate: keyof typeof DESIGN_TEMPLATES
  contentWidth: keyof typeof CONTENT_WIDTHS
  headerLayout: keyof typeof HEADER_LAYOUTS
  documentStyle: keyof typeof DOCUMENT_STYLES
  backgroundTreatment: keyof typeof BACKGROUND_TREATMENTS
  /** `true` keeps the current image; `false` clears it. Absent = unchanged. */
  backgroundImageSet?: boolean
}

const VALID_PRESETS = Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>

function isKeyOf<T extends Record<string, unknown>>(map: T, value: unknown): value is keyof T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(map, value)
}

/** Runtime validation for the untrusted Server Action boundary. */
export function isValidThemeInput(value: unknown): value is ThemeInput {
  if (!value || typeof value !== 'object') return false
  const theme = value as Partial<ThemeInput>
  const validColor = (color: unknown): color is string =>
    typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
  const validFont = (font: unknown): font is string =>
    typeof font === 'string' && FONT_OPTIONS.some((option) => option.value === font)
  const validPreset = isKeyOf(THEME_PRESETS, theme.preset)

  return (
    validPreset &&
    validColor(theme.primaryColor) &&
    validColor(theme.secondaryColor) &&
    validColor(theme.accentColor) &&
    validColor(theme.backgroundColor) &&
    validFont(theme.headingFontKey) &&
    validFont(theme.bodyFontKey) &&
    isKeyOf(DESIGN_TEMPLATES, theme.designTemplate) &&
    isKeyOf(CONTENT_WIDTHS, theme.contentWidth) &&
    isKeyOf(HEADER_LAYOUTS, theme.headerLayout) &&
    isKeyOf(DOCUMENT_STYLES, theme.documentStyle) &&
    isKeyOf(BACKGROUND_TREATMENTS, theme.backgroundTreatment) &&
    (theme.backgroundImageSet === undefined || typeof theme.backgroundImageSet === 'boolean')
  )
}
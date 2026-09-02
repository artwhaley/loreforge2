import { FONT_OPTIONS, THEME_PRESETS } from './fonts'

export type ThemeInput = {
  preset: 'heritage' | 'modern'
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
}

/** Runtime validation for the untrusted Server Action boundary. */
export function isValidThemeInput(value: unknown): value is ThemeInput {
  if (!value || typeof value !== 'object') return false
  const theme = value as Partial<ThemeInput>
  const validColor = (color: unknown): color is string =>
    typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
  const validFont = (font: unknown): font is string =>
    typeof font === 'string' && FONT_OPTIONS.some((option) => option.value === font)

  return (
    (theme.preset === 'heritage' || theme.preset === 'modern') &&
    Object.prototype.hasOwnProperty.call(THEME_PRESETS, theme.preset) &&
    validColor(theme.primaryColor) &&
    validColor(theme.secondaryColor) &&
    validColor(theme.accentColor) &&
    validColor(theme.backgroundColor) &&
    validFont(theme.headingFontKey) &&
    validFont(theme.bodyFontKey)
  )
}

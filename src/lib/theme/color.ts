/**
 * Small WCAG-aware color helpers for Theme Studio derivations.
 * Inputs are studio-validated `#rrggbb` strings; every helper falls back to
 * safe defaults on malformed input so a bad value can never break rendering.
 */

type Rgb = { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const int = Number.parseInt(match[1], 16)
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff }
}

function toHex({ r, g, b }: Rgb): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex) ?? { r: 255, g: 255, b: 255 }
  const channel = (raw: number) => {
    const srgb = raw / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/** WCAG contrast ratio (1–21). Malformed colors compare against white. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Linear mix of two hex colors; `t` = amount moved toward `toward` (0–1). */
export function mixColors(from: string, toward: string, t: number): string {
  const a = hexToRgb(from) ?? { r: 255, g: 255, b: 255 }
  const b = hexToRgb(toward) ?? { r: 255, g: 255, b: 255 }
  const clamped = Math.max(0, Math.min(1, t))
  return toHex({
    r: a.r + (b.r - a.r) * clamped,
    g: a.g + (b.g - a.g) * clamped,
    b: a.b + (b.b - a.b) * clamped,
  })
}

/** Highest-contrast readable text color (`#FFFFFF` or near-black) for a background. */
export function readableTextColor(background: string): string {
  const dark = '#1A1A1A'
  const onWhite = contrastRatio(background, '#FFFFFF')
  const onDark = contrastRatio(background, dark)
  return onWhite >= onDark ? '#FFFFFF' : dark
}

export type ContrastWarning = { message: string; pair: [string, string] }

const TEXT_MIN = 4.5
const UI_MIN = 3

/**
 * Human-readable contrast warnings for the Studio. Text pairs target 4.5:1,
 * decorative/UI pairs 3:1. Returns an empty array for a fully accessible set.
 */
export function contrastWarnings(vars: {
  primary: string
  secondary: string
  accent: string
  backgroundColor: string
}): ContrastWarning[] {
  const warnings: ContrastWarning[] = []
  const onPrimary = readableTextColor(vars.primary)

  if (contrastRatio(onPrimary, vars.primary) < TEXT_MIN) {
    warnings.push({ message: 'Header text may be hard to read on the header color. Try a darker or lighter header color.', pair: [onPrimary, vars.primary] })
  }
  if (contrastRatio(vars.primary, vars.backgroundColor) < TEXT_MIN) {
    warnings.push({ message: 'Headings may be hard to read on the page background.', pair: [vars.primary, vars.backgroundColor] })
  }
  if (contrastRatio(vars.accent, vars.primary) < UI_MIN) {
    warnings.push({ message: 'Accent details (underlines, rules) may be hard to see on the header color.', pair: [vars.accent, vars.primary] })
  }
  if (contrastRatio(vars.primary, vars.secondary) < UI_MIN) {
    warnings.push({ message: 'The secondary color is very close to the header color; surfaces using it may blend together.', pair: [vars.primary, vars.secondary] })
  }
  return warnings
}

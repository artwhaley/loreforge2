import type { DesignDefinition } from '@/lib/design/types'
import type { ValidationResult } from '@/lib/design/contracts'
import { isHexColor } from '@/lib/design/validate'
import { resolveFontStack } from '@/lib/theme/fonts'

export type AtelierConfigV1 = {
  paper: 'ivory' | 'chalk' | 'clay'
  accent: string
  typography: 'editorial' | 'classical'
  density: 'comfortable' | 'compact'
  ruleWeight: number
}
export const atelierDefaults: AtelierConfigV1 = { paper: 'ivory', accent: '#924c38', typography: 'editorial', density: 'comfortable', ruleWeight: 1 }
export function validateAtelier(raw: unknown): ValidationResult<AtelierConfigV1> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['Atelier settings must be an object.'] }
  const v = raw as Record<string, unknown>
  const errors: string[] = []
  if (Object.keys(v).some(k => !Object.keys(atelierDefaults).includes(k))) errors.push('Unsupported setting.')
  if (!['ivory', 'chalk', 'clay'].includes(String(v.paper))) errors.push('Choose a supported paper.')
  if (!isHexColor(v.accent)) errors.push('Accent must be a six-digit hex color.')
  if (!['editorial', 'classical'].includes(String(v.typography))) errors.push('Choose a supported typography pairing.')
  if (!['comfortable', 'compact'].includes(String(v.density))) errors.push('Choose a supported density.')
  if (typeof v.ruleWeight !== 'number' || !Number.isInteger(v.ruleWeight) || v.ruleWeight < 1 || v.ruleWeight > 3) errors.push('Rule weight must be 1, 2, or 3.')
  if (errors.length) return { ok: false, errors }
  return { ok: true, value: { paper: v.paper as AtelierConfigV1['paper'], accent: v.accent as string, typography: v.typography as AtelierConfigV1['typography'], density: v.density as AtelierConfigV1['density'], ruleWeight: v.ruleWeight as number } }
}
export const atelierConfig: DesignDefinition<AtelierConfigV1>['config'] = {
  version: 1, defaults: atelierDefaults, validate: validateAtelier,
  migrate: (version, raw) => version === 1 ? validateAtelier(raw) : { ok: false, errors: [`Unsupported Atelier version ${version}.`] },
  resolveTheme(config) {
    const paper = { ivory: '#f1ecdf', chalk: '#f7f5ee', clay: '#e5d6c5' }[config.paper]
    const heading = resolveFontStack(config.typography === 'editorial' ? 'georgia' : 'palatino')
    return { base: { primary: '#292b28', secondary: '#ded8c9', accent: config.accent, pageBg: paper, surfaceBg: '#faf7ef', surfaceBorder: '#b6b0a2', textOnPrimary: '#faf7ef', headingFont: heading, bodyFont: resolveFontStack('tahoma'), mutedText: '#676359' }, vars: {
      '--atelier-paper': paper, '--atelier-ink': '#292b28', '--atelier-accent': config.accent,
      '--atelier-heading': heading, '--atelier-rule': `${config.ruleWeight}px`, '--atelier-row': config.density === 'compact' ? '12px' : '20px',
    } }
  },
}

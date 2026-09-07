import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'
import type { DesignDefinition, DesignKey } from './types'

/**
 * Static, source-controlled Design Registry (spec §8). First-party Designs
 * only: no plugin loader, no runtime registration, no marketplace. Adding a
 * Design is one new `src/designs/<key>/` folder plus one registry entry.
 */
export const DESIGNS: Record<DesignKey, DesignDefinition> = { civic, ledger, poster }

/**
 * resolveDesign is the single entry-point. Unknown/stale keys fall back to
 * the default (Civic) safely (spec §32 error handling).
 */
export function resolveDesign(key: unknown): DesignDefinition {
  return key === 'civic' || key === 'ledger' || key === 'poster' ? DESIGNS[key] : DESIGNS.civic
}

export const DESIGN_KEYS: DesignKey[] = ['civic', 'ledger', 'poster']

export const DESIGN_METADATA = DESIGN_KEYS.map((key) => ({
  key,
  name: DESIGNS[key].name,
  description: DESIGNS[key].description,
  thumbnail: DESIGNS[key].preview.thumbnail,
}))

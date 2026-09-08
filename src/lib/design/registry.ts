import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'
import { obsidian } from '@/designs/obsidian'
import type { DesignDefinition, DesignKey } from './types'
import { DESIGN_CATALOG, type DesignCatalogEntry } from './catalog'

/**
 * Static, source-controlled Design Registry (spec §8). First-party Designs
 * only: no plugin loader, no runtime registration, no marketplace. Adding a
 * Design is one new `src/designs/<key>/` folder plus one registry entry and
 * one catalog row.
 *
 * Localized type erasure (P08D-T03-D): each Design carries its own config
 * generic; the registry stores them as `DesignDefinition` (config erased)
 * so routes and dispatch never see `any` or hand-write per-Design branches.
 */
// Localized type erasure (P08D-T03-D): each Design is typed with its own
// config generic; this single spot erases to the shared Definition so routes
// and dispatch never branch per Design or see `any`.
function eraseConfig<TConfig extends object>(definition: DesignDefinition<TConfig>): DesignDefinition {
  return definition as unknown as DesignDefinition
}

export const DESIGNS: Record<DesignKey, DesignDefinition> = {
  civic: eraseConfig(civic),
  ledger: eraseConfig(ledger),
  poster: eraseConfig(poster),
  obsidian: eraseConfig(obsidian),
}

/**
 * resolveDesign is the single entry-point. Unknown/stale keys fall back to
 * the default (Civic) safely (spec §32 error handling).
 */
export function resolveDesign(key: unknown): DesignDefinition {
  return key === 'civic' || key === 'ledger' || key === 'poster' || key === 'obsidian' ? DESIGNS[key] : DESIGNS.civic
}

export const DESIGN_KEYS: DesignKey[] = ['civic', 'ledger', 'poster', 'obsidian']

/** Basic metadata comes from the pure catalog — never re-declared per module. */
export const DESIGN_METADATA: DesignCatalogEntry[] = DESIGN_KEYS.map((key) => {
  const entry = DESIGN_CATALOG.find((candidate) => candidate.key === key)
  if (!entry) throw new Error(`catalog missing metadata for ${key}`)
  return { ...entry }
})

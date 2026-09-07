// Shared pure validation helpers for Design configs (P08D-T03). Client-safe
// and Payload-safe: no React, no auth, no database. Every Design config
// validator composes these so the acceptance rules (hex colors, local /media/
// asset refs, curated font keys) stay identical across vocabularies.
import { FONT_KEYS, type DesignAssetRef, type FontKey, type ValidationResult } from './contracts'

export const ok = <T>(value: T): ValidationResult<T> => ({ ok: true, value })
export const fail = (errors: string[]): { ok: false; errors: string[] } => ({ ok: false, errors })

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

export const isFontKey = (value: unknown): value is FontKey =>
  typeof value === 'string' && (FONT_KEYS as readonly string[]).includes(value)

/** G14/G15: only local authorized media references may be stored. */
export const isDesignAssetRef = (value: unknown): value is DesignAssetRef =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { url?: unknown }).url === 'string' &&
  /^\/media\//.test((value as { url: string }).url)

export const isNullOrAssetRef = (value: unknown): boolean =>
  value === null || isDesignAssetRef(value)

/** Pick a curated string union member, falling back to the default. */
export function pickUnion<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}
// Design config V2 persistence core (P08D-T04, 03_TARGET_CONTRACTS §7).
// Pure and Payload-safe: parse the envelope, validate banks, and merge
// submissions while preserving unknown banks. The server actions and the
// migration script compose these; nothing here touches the database.
import type { DesignDefinition, DesignKey } from './types'
import { isDesignKey } from './types'

export type StoredDesignBank = {
  version: number
  config: unknown
}

export type StoredDomainDesignConfigV2 = {
  schemaVersion: 2
  activeDesign: string
  settingsByDesign: Record<string, StoredDesignBank>
}

/** A submitted bank for a known Design, already carrying its config type. */
export type SubmittedDesignBank<TConfig = unknown> = {
  version: number
  config: TConfig
}

function isBank(value: unknown): value is StoredDesignBank {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const bank = value as Record<string, unknown>
  return typeof bank.version === 'number' && 'config' in bank
}

/**
 * Parse a stored V2 envelope safely. Malformed envelopes return null so the
 * caller falls back to V1/legacy — never a half-parsed object.
 */
export function parseV2Envelope(raw: unknown): StoredDomainDesignConfigV2 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const envelope = raw as Record<string, unknown>
  if (envelope.schemaVersion !== 2) return null
  if (typeof envelope.activeDesign !== 'string' || envelope.activeDesign.length === 0) return null
  const settings = envelope.settingsByDesign
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const settingsByDesign: Record<string, StoredDesignBank> = {}
  for (const [key, bank] of Object.entries(settings as Record<string, unknown>)) {
    if (!isBank(bank)) return null
    settingsByDesign[key] = bank
  }
  return { schemaVersion: 2, activeDesign: envelope.activeDesign, settingsByDesign }
}

export function buildV2Envelope(activeDesign: string, settingsByDesign: Record<string, StoredDesignBank>): StoredDomainDesignConfigV2 {
  return { schemaVersion: 2, activeDesign, settingsByDesign }
}

/**
 * Validate every submitted KNOWN bank with that Design's own validator
 * (migrating versions in memory first). Returns the validated banks keyed by
 * Design key, or the collected errors. Unknown keys are rejected here — the
 * caller never stores an arbitrary Design JSON without per-Design validation.
 */
export function validateSubmittedBanks(
  submissions: Record<string, SubmittedDesignBank<unknown>>,
  knownDesigns: Record<DesignKey, DesignDefinition>,
): { ok: true; banks: Record<string, StoredDesignBank> } | { ok: false; errors: string[] } {
  const banks: Record<string, StoredDesignBank> = {}
  const errors: string[] = []
  for (const [key, submission] of Object.entries(submissions)) {
    if (!isDesignKey(key) || !knownDesigns[key]) {
      errors.push(`Unknown design "${key}" cannot be saved.`)
      continue
    }
    const design = knownDesigns[key]
    const migrated = design.config.migrate(submission.version, submission.config)
    if (!migrated.ok) {
      errors.push(...migrated.errors.map((error) => `${key}: ${error}`))
      continue
    }
    banks[key] = { version: design.config.version, config: migrated.value }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, banks }
}

/**
 * Merge a validated submission into the stored envelope (G7): known banks are
 * replaced, unknown persisted banks are preserved but never executed, and the
 * active key is set. `stored` may be null (no V2 yet).
 */
export function mergeDesignBanks(
  stored: StoredDomainDesignConfigV2 | null,
  validatedBanks: Record<string, StoredDesignBank>,
  activeDesign: string,
): StoredDomainDesignConfigV2 {
  const settingsByDesign: Record<string, StoredDesignBank> = {
    ...(stored?.settingsByDesign ?? {}),
    ...validatedBanks,
  }
  return buildV2Envelope(activeDesign, settingsByDesign)
}

/**
 * Resolve a Design's config for a stored bank through the canonical pipeline:
 * missing bank → defaults; unknown bank version → migration failure → defaults
 * with a diagnostic; invalid config → defaults with a diagnostic. The raw
 * bank never reaches the renderer unvalidated.
 */
export function resolveBankConfig(design: DesignDefinition, bank: StoredDesignBank | undefined): { config: unknown; version: number; diagnostic: string | null } {
  if (!bank) return { config: design.config.defaults, version: design.config.version, diagnostic: null }
  const migrated = design.config.migrate(bank.version, bank.config)
  if (!migrated.ok) {
    return { config: design.config.defaults, version: design.config.version, diagnostic: `stored ${design.key} config (v${bank.version}) failed migration; using defaults` }
  }
  const validated = design.config.validate(migrated.value)
  if (!validated.ok) {
    return { config: design.config.defaults, version: design.config.version, diagnostic: `stored ${design.key} config failed validation; using defaults` }
  }
  return { config: validated.value, version: design.config.version, diagnostic: null }
}
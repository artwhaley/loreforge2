// P08D-T04-D/E: migrate Domain design persistence to the V2 banked envelope.
//
//   node --import tsx src/scripts/migrateP08DesignConfigV2.ts --dry-run
//   node --import tsx src/scripts/migrateP08DesignConfigV2.ts --apply
//
// Safety (G9): requires an explicit local file: DATABASE_URI; supports
// dry-run/apply; checkpoints WAL; makes + verifies a file backup before apply;
// runs inside a transaction; verifies integrity + foreign keys; is
// deterministic and idempotent (valid V2 rows are never rewritten).
//
// The V2 envelope is built per Design through that Design's own config module
// (fromLegacy → validate), never through the registry (which pulls React).
import { DatabaseSync } from 'node:sqlite'
import { existsSync, copyFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { pickDesignKey, validateDomainDesignConfig } from '../lib/design/config.js'
import { buildV2Envelope, parseV2Envelope, type StoredDesignBank } from '../lib/design/v2.js'
import type { LegacyDomainAppearance } from '../lib/design/contracts.js'
import { civicDefaults, civicFromLegacy, migrateCivicConfig, validateCivicConfig } from '../designs/civic/config.js'
import { ledgerDefaults, ledgerFromLegacy, migrateLedgerConfig, validateLedgerConfig } from '../designs/ledger/config.js'
import { posterDefaults, posterFromLegacy, migratePosterConfig, validatePosterConfig } from '../designs/poster/config.js'
import { obsidianDefaults, obsidianFromLegacy, migrateObsidianConfig, validateObsidianConfig } from '../designs/obsidian/config.js'

const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--dry-run') ? 'dry-run' : null
if (!MODE) {
  console.error('Usage: node --import tsx src/scripts/migrateP08DesignConfigV2.ts --dry-run|--apply')
  process.exit(2)
}

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('V2 migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('V2 migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

const dbPath = databasePath(process.env.DATABASE_URI ?? '')
console.log(`[P08D-T04] mode=${MODE} db=${dbPath}`)

type HistoricalConfigModule = {
  defaults: unknown
  fromLegacy?: (legacy: LegacyDomainAppearance) => unknown
  validate: (raw: unknown) => { ok: boolean; value?: unknown }
  migrate: (fromVersion: number, raw: unknown) => { ok: boolean; value?: unknown }
}

const CONFIG_BY_KEY: Record<string, HistoricalConfigModule> = {
  civic: { defaults: civicDefaults, fromLegacy: civicFromLegacy, validate: validateCivicConfig, migrate: migrateCivicConfig },
  ledger: { defaults: ledgerDefaults, fromLegacy: ledgerFromLegacy, validate: validateLedgerConfig, migrate: migrateLedgerConfig },
  poster: { defaults: posterDefaults, fromLegacy: posterFromLegacy, validate: validatePosterConfig, migrate: migratePosterConfig },
  obsidian: { defaults: obsidianDefaults, fromLegacy: obsidianFromLegacy, validate: validateObsidianConfig, migrate: migrateObsidianConfig },
} as const

type DomainRow = {
  id: number
  design_config: string | null
  design_template: string | null
  header_layout: string | null
  document_style: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  background_color: string | null
  heading_font_key: string | null
  body_font_key: string | null
  content_width: string | null
  background_treatment: string | null
}

function parseJsonCell(value: string | null): unknown {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}

function rowToAppearance(row: DomainRow): LegacyDomainAppearance {
  return {
    designTemplate: row.design_template ?? undefined,
    headerLayout: row.header_layout ?? undefined,
    documentStyle: row.document_style ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    secondaryColor: row.secondary_color ?? undefined,
    accentColor: row.accent_color ?? undefined,
    backgroundColor: row.background_color ?? undefined,
    headingFontKey: row.heading_font_key ?? undefined,
    bodyFontKey: row.body_font_key ?? undefined,
    contentWidth: row.content_width ?? undefined,
    backgroundTreatment: row.background_treatment ?? undefined,
  }
}

/** Build the V2 envelope for one Domain (V2 no-op; V1/legacy → one bank). */
function planFor(row: DomainRow): { action: 'noop' | 'write'; envelope?: unknown; designKey?: string } {
  const stored = parseJsonCell(row.design_config)
  if (parseV2Envelope(stored)) return { action: 'noop' }
  const storedV1 = validateDomainDesignConfig(stored)
  const designKey = storedV1 ? pickDesignKey(storedV1.designKey) : pickDesignKey(row.design_template)
  // This migration owns only the designs that existed when V2 persistence was
  // introduced. A later drop-in Design is still a valid runtime key; it gets
  // an empty legacy bank and is allowed to resolve its own defaults on read.
  const configModule = CONFIG_BY_KEY[designKey] ?? CONFIG_BY_KEY.civic
  const appearance = rowToAppearance(row)
  const legacyContext: LegacyDomainAppearance = {
    ...appearance,
    ...(storedV1 ? {
      primaryColor: storedV1.common.primaryColor,
      secondaryColor: storedV1.common.secondaryColor,
      accentColor: storedV1.common.accentColor,
      backgroundColor: storedV1.common.backgroundColor,
      headingFontKey: storedV1.common.headingFontKey,
      bodyFontKey: storedV1.common.bodyFontKey,
      ...(storedV1.common.contentWidth ? { contentWidth: storedV1.common.contentWidth } : {}),
      headerLayout: storedV1.options.headerLayout ?? appearance.headerLayout,
      documentStyle: storedV1.options.documentStyle ?? appearance.documentStyle,
    } : {}),
  }
  const adapted = configModule.fromLegacy?.(legacyContext) ?? configModule.defaults
  const validated = configModule.validate(adapted)
  const bank: StoredDesignBank = { version: 1, config: validated.ok ? validated.value : configModule.defaults }
  const envelope = buildV2Envelope(designKey, { [designKey]: bank })
  return { action: 'write', envelope, designKey }
}

const db = new DatabaseSync(dbPath)
try {
  // WAL checkpoint + integrity + FK verification before any write.
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  const integrity = (db.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check
  if (integrity !== 'ok') throw new Error(`integrity_check failed: ${integrity}`)
  const fk = db.prepare('PRAGMA foreign_key_check').all()
  if (fk.length > 0) throw new Error(`foreign_key_check found ${fk.length} violations`)

  const rows = db.prepare('SELECT id, design_config, design_template, header_layout, document_style, primary_color, secondary_color, accent_color, background_color, heading_font_key, body_font_key, content_width, background_treatment FROM domains').all() as DomainRow[]
  const plans = rows.map((row) => ({ row, plan: planFor(row) }))
  const writes = plans.filter((entry) => entry.plan.action === 'write')
  const noops = plans.filter((entry) => entry.plan.action === 'noop')

  console.log(`domains=${rows.length} writes=${writes.length} already-v2=${noops.length}`)
  for (const entry of writes) {
    console.log(`  domain ${entry.row.id}: write V2 active=${entry.plan.designKey}`)
  }

  if (MODE === 'dry-run') {
    console.log('[dry-run] no changes written.')
    process.exit(0)
  }

  // Backup + verify before mutating.
  const backupPath = `${dbPath}.bak-p08d-v2-${Date.now()}`
  copyFileSync(dbPath, backupPath)
  if (!existsSync(backupPath) || statSync(backupPath).size === 0) throw new Error(`backup failed: ${backupPath}`)
  console.log(`[apply] backup=${backupPath}`)

  db.exec('BEGIN IMMEDIATE')
  const writeStmt = db.prepare('UPDATE domains SET design_config = ? WHERE id = ?')
  for (const entry of writes) {
    writeStmt.run(JSON.stringify(entry.plan.envelope), entry.row.id)
  }
  db.exec('COMMIT')
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)')

  const afterIntegrity = (db.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check
  if (afterIntegrity !== 'ok') throw new Error(`post-write integrity_check failed: ${afterIntegrity}`)

  // Idempotence: rerunning now must find every row already V2.
  const rerun = db.prepare('SELECT id, design_config FROM domains').all() as Array<{ id: number; design_config: string | null }>
  const stillMissing = rerun.filter((row) => !parseV2Envelope(parseJsonCell(row.design_config)))
  if (stillMissing.length > 0) throw new Error(`idempotence check failed: ${stillMissing.length} rows still lack V2`)
  console.log(`[apply] wrote ${writes.length} envelopes; idempotence verified.`)
} finally {
  db.close()
}

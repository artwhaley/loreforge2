import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P08 schema migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P08 schema migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

/**
 * P08 corrective-stack theme schema (owner decision 2026-09-05):
 * - adds the `design_template` column (civic / ledger / poster) to domains
 *   and the legacy tenants mirror, defaulting to `civic` so every existing
 *   Domain renders exactly as before until it re-themes;
 * - clears and drops the removed `vocabulary` columns (vocabulary
 *   customization was rescinded by the owner; platform nouns are code
 *   constants now).
 * Every statement is idempotent; re-running is a no-op.
 */
const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
db.exec('BEGIN IMMEDIATE')
try {
  for (const table of ['domains', 'tenants']) {
    const columns = new Set((db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name))
    if (columns.size === 0) continue
    if (!columns.has('design_template')) db.exec(`ALTER TABLE ${table} ADD COLUMN design_template text DEFAULT 'civic' NOT NULL`)
    // Vocabulary removal: blank any stored values, then drop the column.
    if (columns.has('vocabulary')) {
      db.exec(`UPDATE ${table} SET vocabulary = NULL WHERE vocabulary IS NOT NULL`)
      db.exec(`ALTER TABLE ${table} DROP COLUMN vocabulary`)
    }
  }
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
console.log('P08 corrective theme migration complete: design_template present, vocabulary removed, on domains and tenants.')
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P07X schema migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P07X schema migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

/**
 * P07X-T01 — add `characters.kind` and `characters.administrative_domain_id`
 * without Payload's destructive dev push. Matches the payload sqlite adapter
 * column conventions used by migratePhase7Authorization.ts.
 */
const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
db.exec('BEGIN IMMEDIATE')
try {
  const columns = new Set((db.prepare('PRAGMA table_info(characters)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!columns.has('kind')) db.exec("ALTER TABLE characters ADD COLUMN kind text DEFAULT 'player' NOT NULL")
  if (!columns.has('administrative_domain_id')) db.exec('ALTER TABLE characters ADD COLUMN administrative_domain_id integer')
  db.exec('CREATE INDEX IF NOT EXISTS characters_kind_idx ON characters (kind)')
  db.exec('CREATE INDEX IF NOT EXISTS characters_administrative_domain_idx ON characters (administrative_domain_id)')
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
console.log('P07X schema migration complete: characters.kind and characters.administrative_domain_id are present.')

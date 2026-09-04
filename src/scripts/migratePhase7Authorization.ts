import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('Phase 7 authorization migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('Phase 7 authorization migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
db.exec('BEGIN IMMEDIATE')
try {
  const columns = new Set((db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!columns.has('is_platform_admin')) db.exec('ALTER TABLE users ADD COLUMN is_platform_admin integer NOT NULL DEFAULT 0')
  db.exec('CREATE INDEX IF NOT EXISTS users_is_platform_admin_idx ON users (is_platform_admin)')
  const claimColumns = new Set((db.prepare('PRAGMA table_info(character_claim_requests)').all() as Array<{ name: string }>).map((row) => row.name))
  if (claimColumns.size > 0 && !claimColumns.has('domain_id')) db.exec('ALTER TABLE character_claim_requests ADD COLUMN domain_id integer')
  if (claimColumns.size > 0) db.exec('CREATE INDEX IF NOT EXISTS character_claim_requests_domain_idx ON character_claim_requests (domain_id)')
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
console.log('P07 authorization migration complete: users.is_platform_admin is present.')

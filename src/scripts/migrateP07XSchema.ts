import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P07X schema migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P07X schema migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

/**
 * P07X schema additions — add the Character-kind columns and the Document Type
 * creation/routing columns without Payload's destructive dev push. Matches the
 * payload sqlite adapter column conventions used by the earlier migrations.
 */
const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
db.exec('BEGIN IMMEDIATE')
try {
  const columns = new Set((db.prepare('PRAGMA table_info(characters)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!columns.has('kind')) db.exec("ALTER TABLE characters ADD COLUMN kind text DEFAULT 'player' NOT NULL")
  if (!columns.has('administrative_domain_id')) db.exec('ALTER TABLE characters ADD COLUMN administrative_domain_id integer')
  db.exec('CREATE INDEX IF NOT EXISTS characters_kind_idx ON characters (kind)')
  db.exec('CREATE INDEX IF NOT EXISTS characters_administrative_domain_idx ON characters (administrative_domain_id)')
  const typeColumns = new Set((db.prepare('PRAGMA table_info(document_types)').all() as Array<{ name: string }>).map((row) => row.name))
  // Checkbox defaults preserve the pre-P07X behavior for existing Types:
  // blank creation remains available, while Template/Form must be enabled by
  // an explicit migration or authoring decision.
  if (!typeColumns.has('allow_blank')) db.exec("ALTER TABLE document_types ADD COLUMN allow_blank integer DEFAULT true")
  if (!typeColumns.has('allow_template')) db.exec("ALTER TABLE document_types ADD COLUMN allow_template integer DEFAULT false")
  if (!typeColumns.has('allow_form')) db.exec("ALTER TABLE document_types ADD COLUMN allow_form integer DEFAULT false")
  if (!typeColumns.has('draft_folder_id')) db.exec('ALTER TABLE document_types ADD COLUMN draft_folder_id integer')
  if (!typeColumns.has('pending_review_folder_id')) db.exec('ALTER TABLE document_types ADD COLUMN pending_review_folder_id integer')
  if (!typeColumns.has('filed_folder_id')) db.exec('ALTER TABLE document_types ADD COLUMN filed_folder_id integer')
  if (!typeColumns.has('locked_folder_id')) db.exec('ALTER TABLE document_types ADD COLUMN locked_folder_id integer')
  db.exec('CREATE INDEX IF NOT EXISTS document_types_draft_folder_idx ON document_types (draft_folder_id)')
  db.exec('CREATE INDEX IF NOT EXISTS document_types_pending_review_folder_idx ON document_types (pending_review_folder_id)')
  db.exec('CREATE INDEX IF NOT EXISTS document_types_filed_folder_idx ON document_types (filed_folder_id)')
  db.exec('CREATE INDEX IF NOT EXISTS document_types_locked_folder_idx ON document_types (locked_folder_id)')
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
console.log('P07X schema migration complete: Character kinds, Document Type creation methods, and lifecycle routes are present.')

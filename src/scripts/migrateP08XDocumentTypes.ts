import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P08X schema migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P08X schema migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

/**
 * P08X-T02 schema additions — the type tree, template selection, lifecycle
 * stages, the locked boolean, private drafts, and the supersede prior-lock
 * bookkeeping. Green-field 1.0: new tables/columns only, NO data backfill and
 * NO value remaps (old development databases are abandoned, not upgraded).
 * Matches the payload sqlite adapter column conventions of the earlier
 * migrations.
 */
const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
db.exec('BEGIN IMMEDIATE')
try {
  // 1. type-folders — navigation-only folders for the Document Type tree.
  db.exec(`CREATE TABLE IF NOT EXISTS type_folders (
    id integer PRIMARY KEY NOT NULL,
    domain_id integer NOT NULL,
    department_id integer,
    name text NOT NULL,
    parent_id integer,
    system_managed integer DEFAULT false,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  db.exec('CREATE INDEX IF NOT EXISTS type_folders_domain_idx ON type_folders (domain_id)')
  db.exec('CREATE INDEX IF NOT EXISTS type_folders_department_idx ON type_folders (department_id)')
  db.exec('CREATE INDEX IF NOT EXISTS type_folders_parent_idx ON type_folders (parent_id)')

  // 2. Document Type tree placement + template selection.
  const typeColumns = new Set((db.prepare('PRAGMA table_info(document_types)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!typeColumns.has('department_id')) db.exec('ALTER TABLE document_types ADD COLUMN department_id integer')
  if (!typeColumns.has('type_folder_id')) db.exec('ALTER TABLE document_types ADD COLUMN type_folder_id integer')
  if (!typeColumns.has('template_selection')) db.exec("ALTER TABLE document_types ADD COLUMN template_selection text DEFAULT 'blank' NOT NULL")
  db.exec('CREATE INDEX IF NOT EXISTS document_types_department_idx ON document_types (department_id)')
  db.exec('CREATE INDEX IF NOT EXISTS document_types_type_folder_idx ON document_types (type_folder_id)')

  // 3. lifecycle-stages — one row per (Document Type, stage).
  db.exec(`CREATE TABLE IF NOT EXISTS lifecycle_stages (
    id integer PRIMARY KEY NOT NULL,
    document_type_id integer NOT NULL,
    stage text NOT NULL,
    enabled integer DEFAULT true,
    allow_on_creation integer DEFAULT false,
    folder_id integer,
    private_drafts_allowed integer DEFAULT true,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_stages_document_type_stage_unique ON lifecycle_stages (document_type_id, stage)')
  db.exec('CREATE INDEX IF NOT EXISTS lifecycle_stages_document_type_idx ON lifecycle_stages (document_type_id)')
  db.exec('CREATE INDEX IF NOT EXISTS lifecycle_stages_stage_idx ON lifecycle_stages (stage)')
  db.exec('CREATE INDEX IF NOT EXISTS lifecycle_stages_folder_idx ON lifecycle_stages (folder_id)')

  // The four role lists are hasMany relationships: Payload stores them in the
  // collection's _rels join table with one row per assignment.
  // `order` is a reserved word in modern SQLite; Payload quotes it in its own
  // rels-table DDL, so we do too.
  db.exec(`CREATE TABLE IF NOT EXISTS lifecycle_stages_rels (
    id integer PRIMARY KEY NOT NULL,
    "order" integer,
    parent_id integer,
    path text,
    roles_id integer,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  db.exec('CREATE INDEX IF NOT EXISTS lifecycle_stages_rels_parent_idx ON lifecycle_stages_rels (parent_id)')
  db.exec('CREATE INDEX IF NOT EXISTS lifecycle_stages_rels_roles_idx ON lifecycle_stages_rels (roles_id)')

  // 4. Documents: locked boolean (default false) + privateDraft (default true).
  const documentColumns = new Set((db.prepare('PRAGMA table_info(documents)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!documentColumns.has('locked')) db.exec('ALTER TABLE documents ADD COLUMN locked integer DEFAULT false')
  if (!documentColumns.has('private_draft')) db.exec('ALTER TABLE documents ADD COLUMN private_draft integer DEFAULT true')
  db.exec('CREATE INDEX IF NOT EXISTS documents_locked_idx ON documents (locked)')

  // 5. document-relationships: priorLifecycle -> priorLocked boolean.
  const relationshipColumns = new Set((db.prepare('PRAGMA table_info(document_relationships)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!relationshipColumns.has('prior_locked')) db.exec('ALTER TABLE document_relationships ADD COLUMN prior_locked integer DEFAULT false')

  // 6. Payload tracks lock relations for every collection; these columns must
  // exist before the access-closed request collections can be queried with
  // Payload's generated relation projection.
  const lockedRelationColumns = new Set((db.prepare('PRAGMA table_info(payload_locked_documents_rels)').all() as Array<{ name: string }>).map((row) => row.name))
  for (const name of ['type_folders_id', 'lifecycle_stages_id']) {
    if (!lockedRelationColumns.has(name)) db.exec(`ALTER TABLE payload_locked_documents_rels ADD COLUMN ${name} integer`)
    db.exec(`CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_${name}_idx ON payload_locked_documents_rels (${name})`)
  }

  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
console.log('P08X schema migration complete: type tree, template selection, lifecycle stages, locked, private drafts, and prior lock are present.')
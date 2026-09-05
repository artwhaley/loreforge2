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

  // P07X-T03 adds DocumentType to PermissionRule's polymorphic resource
  // relation. Older databases already have this relation table for the other
  // resource collections, so add only the new nullable target column.
  const permissionRuleRelColumns = new Set((db.prepare('PRAGMA table_info(permission_rules_rels)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!permissionRuleRelColumns.has('document_types_id')) db.exec('ALTER TABLE permission_rules_rels ADD COLUMN document_types_id integer')
  db.exec('CREATE INDEX IF NOT EXISTS permission_rules_rels_document_types_id_idx ON permission_rules_rels (document_types_id)')

  // P07X-T07: Form Studio's fixed Markdown chrome is nullable so existing
  // Templates and Forms retain their prior output when the fields are empty.
  const templateColumns = new Set((db.prepare('PRAGMA table_info(templates)').all() as Array<{ name: string }>).map((row) => row.name))
  if (!templateColumns.has('header_markdown')) db.exec('ALTER TABLE templates ADD COLUMN header_markdown text')
  if (!templateColumns.has('footer_markdown')) db.exec('ALTER TABLE templates ADD COLUMN footer_markdown text')

  // Payload tracks lock relations for every collection. These three columns
  // are the T08/T09 additions and must exist before the access-closed request
  // collections can be queried with Payload's generated relation projection.
  const lockedRelationColumns = new Set((db.prepare('PRAGMA table_info(payload_locked_documents_rels)').all() as Array<{ name: string }>).map((row) => row.name))
  for (const name of ['invitations_id', 'domain_bootstrap_requests_id', 'domain_join_requests_id']) {
    if (!lockedRelationColumns.has(name)) db.exec(`ALTER TABLE payload_locked_documents_rels ADD COLUMN ${name} integer`)
    db.exec(`CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_${name}_idx ON payload_locked_documents_rels (${name})`)
  }

  // P07X-T08: one access-closed invitation table shared by bootstrap,
  // character-claim, and general Domain links. Raw token material is never a
  // column; token_hash stores only the SHA-256 digest.
  db.exec(`CREATE TABLE IF NOT EXISTS invitations (
    id integer PRIMARY KEY NOT NULL,
    purpose text NOT NULL,
    domain_id integer,
    character_id integer,
    token_hash text NOT NULL,
    issued_by_user_id integer NOT NULL,
    issued_by_character_id integer NOT NULL,
    expires_at text,
    revoked_at text,
    max_uses numeric,
    use_count numeric DEFAULT 0 NOT NULL,
    last_used_at text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  const invitationColumns = new Set((db.prepare('PRAGMA table_info(invitations)').all() as Array<{ name: string }>).map((row) => row.name))
  for (const [name, definition] of [
    ['purpose', "text NOT NULL DEFAULT 'domain_join'"],
    ['domain_id', 'integer'], ['character_id', 'integer'], ['token_hash', "text NOT NULL DEFAULT ''"],
    ['issued_by_user_id', 'integer NOT NULL DEFAULT 0'], ['issued_by_character_id', 'integer NOT NULL DEFAULT 0'],
    ['expires_at', 'text'], ['revoked_at', 'text'], ['max_uses', 'numeric'],
    ['use_count', 'numeric DEFAULT 0 NOT NULL'], ['last_used_at', 'text'],
  ] as const) {
    if (!invitationColumns.has(name)) db.exec(`ALTER TABLE invitations ADD COLUMN ${name} ${definition}`)
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_unique ON invitations (token_hash)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_purpose_idx ON invitations (purpose)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_domain_idx ON invitations (domain_id)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_character_idx ON invitations (character_id)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_issued_by_user_idx ON invitations (issued_by_user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_issued_by_character_idx ON invitations (issued_by_character_id)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_expires_at_idx ON invitations (expires_at)')
  db.exec('CREATE INDEX IF NOT EXISTS invitations_revoked_at_idx ON invitations (revoked_at)')

  // P07X-T09 request truth for the two approval-based invitation flows.
  db.exec(`CREATE TABLE IF NOT EXISTS domain_bootstrap_requests (
    id integer PRIMARY KEY NOT NULL,
    domain_id integer NOT NULL,
    user_id integer NOT NULL,
    invitation_id integer NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    requested_at text NOT NULL,
    decided_at text,
    decided_by_id integer,
    deciding_character_id integer,
    decision_note text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS domain_join_requests (
    id integer PRIMARY KEY NOT NULL,
    domain_id integer NOT NULL,
    user_id integer NOT NULL,
    invitation_id integer NOT NULL,
    character_id integer,
    requested_name text,
    status text DEFAULT 'pending' NOT NULL,
    requested_at text NOT NULL,
    decided_at text,
    decided_by_id integer,
    deciding_character_id integer,
    decision_note text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  )`)
  db.exec('CREATE INDEX IF NOT EXISTS domain_bootstrap_requests_domain_idx ON domain_bootstrap_requests (domain_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_bootstrap_requests_user_idx ON domain_bootstrap_requests (user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_bootstrap_requests_invitation_idx ON domain_bootstrap_requests (invitation_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_bootstrap_requests_status_idx ON domain_bootstrap_requests (status)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_join_requests_domain_idx ON domain_join_requests (domain_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_join_requests_user_idx ON domain_join_requests (user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_join_requests_invitation_idx ON domain_join_requests (invitation_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_join_requests_character_idx ON domain_join_requests (character_id)')
  db.exec('CREATE INDEX IF NOT EXISTS domain_join_requests_status_idx ON domain_join_requests (status)')
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
console.log('P07X schema migration complete: Character kinds, Document Type creation methods, and lifecycle routes are present.')

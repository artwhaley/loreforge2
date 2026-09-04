/**
 * P07P-03 index migration: composite indexes for the authorization-session
 * loader and authorized read paths (spec: "Add explicit migrations for
 * missing measured composite indexes").
 *
 * Measured hot shapes (src/lib/authz/session.ts loadFacts, readScope):
 *   domain_memberships (domain_id, character_id, status)
 *   domain_memberships (character_id, status)                [tenant-union queries]
 *   role_assignments   (character_id, status, role_id)
 *   roles              (domain_id, subdomain_id, parent_role_id, active)
 *   folders            (domain_id, parent_id)
 *   permission_rules   (domain_id, capability, active)         [per-capability rule bucket]
 *   documents          (domain_id, folder_id)                  [scope + bulk metadata]
 *   documents          (domain_id, updated_at)                 [recent-records sort]
 *   document_relationships (domain_id, kind)                   [supersession groups]
 *   domain_character_contexts (domain_id, character_id)
 *   document_provenance_events (document_id, occurred_at, id)   [recent action]
 *
 * Idempotent (IF NOT EXISTS). BEGIN IMMEDIATE matches the shared transaction
 * convention; failure rolls back with no partial indexes. Non-destructive:
 * adds indexes only, never drops or rewrites.
 */
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P07P index migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P07P index migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))

const INDEXES: Array<[string, string]> = [
  ['p07p_memberships_domain_character_status_idx', 'CREATE INDEX IF NOT EXISTS `p07p_memberships_domain_character_status_idx` ON `domain_memberships` (`domain_id`,`character_id`,`status`)'],
  ['p07p_memberships_character_status_idx', 'CREATE INDEX IF NOT EXISTS `p07p_memberships_character_status_idx` ON `domain_memberships` (`character_id`,`status`)'],
  ['p07p_assignments_character_status_role_idx', 'CREATE INDEX IF NOT EXISTS `p07p_assignments_character_status_role_idx` ON `role_assignments` (`character_id`,`status`,`role_id`)'],
  ['p07p_roles_domain_subdomain_parent_active_idx', 'CREATE INDEX IF NOT EXISTS `p07p_roles_domain_subdomain_parent_active_idx` ON `roles` (`domain_id`,`subdomain_id`,`parent_role_id`,`active`)'],
  ['p07p_folders_domain_parent_idx', 'CREATE INDEX IF NOT EXISTS `p07p_folders_domain_parent_idx` ON `folders` (`domain_id`,`parent_id`)'],
  ['p07p_rules_domain_capability_active_idx', 'CREATE INDEX IF NOT EXISTS `p07p_rules_domain_capability_active_idx` ON `permission_rules` (`domain_id`,`capability`,`active`)'],
  ['p07p_documents_domain_folder_idx', 'CREATE INDEX IF NOT EXISTS `p07p_documents_domain_folder_idx` ON `documents` (`domain_id`,`folder_id`)'],
  ['p07p_documents_domain_updated_idx', 'CREATE INDEX IF NOT EXISTS `p07p_documents_domain_updated_idx` ON `documents` (`domain_id`,`updated_at`)'],
  ['p07p_relationships_domain_kind_idx', 'CREATE INDEX IF NOT EXISTS `p07p_relationships_domain_kind_idx` ON `document_relationships` (`domain_id`,`kind`)'],
  ['p07p_contexts_domain_character_idx', 'CREATE INDEX IF NOT EXISTS `p07p_contexts_domain_character_idx` ON `domain_character_contexts` (`domain_id`,`character_id`)'],
  ['p07p_provenance_document_occurred_idx', 'CREATE INDEX IF NOT EXISTS `p07p_provenance_document_occurred_idx` ON `document_provenance_events` (`document_id`,`occurred_at`,`id`)'],
]

db.exec('BEGIN IMMEDIATE')
try {
  for (const [name, ddl] of INDEXES) {
    db.exec(ddl)
    console.log(`index ok: ${name}`)
  }
  db.exec('COMMIT')
  console.log('P07P-03 index migration complete.')
} catch (error) {
  db.exec('ROLLBACK')
  console.error(`index migration failed, rolled back: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
} finally {
  db.close()
}

/**
 * P05R-T14: safe, repeatable upgrade for an existing local SQLite database.
 *
 * This script deliberately uses SQLite directly.  The normal development
 * server runs with PAYLOAD_PUSH=false, so a fresh test database can be newer
 * than a populated development database.  The script performs a read-only
 * preflight first, takes a consistent VACUUM INTO backup, then applies only
 * additive/transactional changes.  It never seeds, resets, or deletes
 * application data except for an explicitly safe consolidation of duplicate
 * equivalent PermissionRule rows.
 */
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

type Row = Record<string, unknown>
type RelationName = 'characters' | 'users' | 'roles' | 'domain-memberships' | 'domains' | 'subdomains' | 'folders' | 'documents'

const MIGRATION_ID = 'P05R-T14'
const databaseUri = process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'

const parseDatabasePath = (uri: string): string => {
  if (!uri.startsWith('file:')) throw new Error(`P05R-T14 only supports local file: DATABASE_URI values (received ${uri.split(':')[0] ?? 'unknown'}).`)
  const raw = uri.slice('file:'.length).split('?')[0]
  if (!raw || raw === ':memory:') throw new Error('P05R-T14 requires a concrete local SQLite file, not an in-memory database.')
  const decoded = decodeURIComponent(raw)
  if (/^\/\//.test(decoded) || /^[a-z]+:\/\//i.test(decoded)) throw new Error('P05R-T14 refuses remote SQLite URIs.')
  return resolve(process.cwd(), decoded)
}

const dbPath = parseDatabasePath(databaseUri)
const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply
const explicitBackup = process.argv.find((arg) => arg.startsWith('--backup='))?.slice('--backup='.length)

const q = (value: string) => `"${value.replaceAll('"', '""')}"`
const sqlLiteral = (value: string) => `'${value.replaceAll("'", "''")}'`
const columns = (db: DatabaseSync, table: string): Set<string> => new Set((db.prepare(`PRAGMA table_info(${q(table)})`).all() as Row[]).map((row) => String(row.name)))
const tableExists = (db: DatabaseSync, table: string) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
const indexExists = (db: DatabaseSync, name: string) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?").get(name))
const triggerExists = (db: DatabaseSync, name: string) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='trigger' AND name=?").get(name))

const tableRows = (db: DatabaseSync, table: string): Row[] => db.prepare(`SELECT * FROM ${q(table)} ORDER BY id`).all() as Row[]
const fingerprintOmissions: Record<string, string[]> = {
  folders: ['public_access'],
  permission_rules: ['rule_key'],
  document_relationships: ['lock_applied', 'prior_lifecycle'],
}
const tableFingerprint = (db: DatabaseSync, table: string): string => {
  const omitted = new Set(fingerprintOmissions[table] ?? [])
  const stableRows = tableRows(db, table).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !omitted.has(key))))
  return createHash('sha256').update(JSON.stringify(stableRows)).digest('hex')
}
const tableCount = (db: DatabaseSync, table: string): number => Number((db.prepare(`SELECT count(*) AS count FROM ${q(table)}`).get() as Row).count)

const relationColumns: Array<[RelationName, string]> = [
  ['characters', 'characters_id'],
  ['users', 'users_id'],
  ['roles', 'roles_id'],
  ['domain-memberships', 'domain_memberships_id'],
  ['domains', 'domains_id'],
  ['subdomains', 'subdomains_id'],
  ['folders', 'folders_id'],
  ['documents', 'documents_id'],
]
const principalTypes: Record<string, RelationName> = { Character: 'characters', User: 'users', Role: 'roles', DomainMembership: 'domain-memberships' }
const resourceTypes: Record<string, RelationName> = { Domain: 'domains', Subdomain: 'subdomains', Folder: 'folders', Document: 'documents' }

const ruleIdentity = (row: Row, relRows: Row[], side: 'principal' | 'resource', typeMap: Record<string, RelationName>) => {
  const declared = String(row[`${side}_type`] ?? '')
  const expected = typeMap[declared]
  if (!expected) throw new Error(`PermissionRule ${row.id} has unknown ${side} type ${declared}.`)
  const path = side
  const candidates = relRows.filter((rel) => String(rel.path) === path)
  if (candidates.length !== 1) throw new Error(`PermissionRule ${row.id} must have exactly one ${side} relation row.`)
  const candidate = candidates[0]
  const present = relationColumns.filter(([, column]) => candidate[column] !== null && candidate[column] !== undefined)
  if (present.length !== 1 || present[0][0] !== expected) {
    throw new Error(`PermissionRule ${row.id} ${side} relation does not match declared ${declared}.`)
  }
  const id = Number(candidate[present[0][1]])
  if (!Number.isInteger(id) || id <= 0) throw new Error(`PermissionRule ${row.id} has an invalid ${side} relation id.`)
  return { relation: expected, id }
}

const preflight = (db: DatabaseSync) => {
  const blockers: string[] = []
  const nullFolders = db.prepare('SELECT id,domain_id FROM documents WHERE folder_id IS NULL ORDER BY id').all() as Row[]
  const folderBackfill: Array<{ documentId: number; folderId: number }> = []
  for (const doc of nullFolders) {
    const domainId = Number(doc.domain_id)
    if (!Number.isInteger(domainId) || domainId <= 0) {
      blockers.push(`Document ${doc.id} has no Folder and no known Domain.`)
      continue
    }
    const roots = db.prepare('SELECT id FROM folders WHERE domain_id=? AND parent_id IS NULL AND subdomain_id IS NULL ORDER BY id').all(domainId) as Row[]
    if (roots.length !== 1) {
      blockers.push(`Document ${doc.id} Domain ${domainId} has ${roots.length} candidate Domain roots; refusing to guess.`)
      continue
    }
    folderBackfill.push({ documentId: Number(doc.id), folderId: Number(roots[0].id) })
  }

  const ruleRows = tableExists(db, 'permission_rules') ? tableRows(db, 'permission_rules') : []
  const relRows = tableExists(db, 'permission_rules_rels') ? (db.prepare('SELECT * FROM permission_rules_rels ORDER BY id').all() as Row[]) : []
  const keys = new Map<string, Array<{ id: number; effect: string; active: boolean }>>()
  const ruleKeyById = new Map<number, string>()
  for (const row of ruleRows) {
    try {
      const related = relRows.filter((rel) => Number(rel.parent_id) === Number(row.id))
      const principal = ruleIdentity(row, related, 'principal', principalTypes)
      const resource = ruleIdentity(row, related, 'resource', resourceTypes)
      const key = JSON.stringify([Number(row.domain_id), String(row.principal_type), principal.relation, principal.id, String(row.resource_type), resource.relation, resource.id, String(row.capability)])
      ruleKeyById.set(Number(row.id), key)
      const state = { id: Number(row.id), effect: String(row.effect), active: Boolean(row.active) }
      keys.set(key, [...(keys.get(key) ?? []), state])
    } catch (error) {
      blockers.push(error instanceof Error ? error.message : String(error))
    }
  }
  const duplicateConsolidations: Array<{ key: string; survivor: number; removed: number[] }> = []
  for (const [key, rows] of keys) {
    if (rows.length < 2) continue
    const sameState = rows.every((row) => row.effect === rows[0].effect && row.active === rows[0].active)
    if (!sameState) blockers.push(`PermissionRule identity ${key} has conflicting effect/active states (${rows.map((row) => row.id).join(', ')}).`)
    else duplicateConsolidations.push({ key, survivor: Math.min(...rows.map((row) => row.id)), removed: rows.map((row) => row.id).filter((id) => id !== Math.min(...rows.map((row) => row.id))) })
  }

  const supersedes = tableExists(db, 'document_relationships')
    ? (db.prepare("SELECT id,source_id,target_id FROM document_relationships WHERE kind='supersedes' ORDER BY id").all() as Row[])
    : []
  const bySource = new Map<number, number[]>()
  const byTarget = new Map<number, number[]>()
  const edges = new Map<number, number>()
  for (const edge of supersedes) {
    const source = Number(edge.source_id); const target = Number(edge.target_id)
    if (source === target) blockers.push(`Supersession edge ${edge.id} is self-referential.`)
    bySource.set(source, [...(bySource.get(source) ?? []), target])
    byTarget.set(target, [...(byTarget.get(target) ?? []), source])
    edges.set(source, target)
  }
  for (const [source, targets] of bySource) if (targets.length > 1) blockers.push(`Supersession source ${source} has multiple targets (${targets.join(', ')}).`)
  for (const [target, sources] of byTarget) if (sources.length > 1) blockers.push(`Supersession target ${target} has multiple sources (${sources.join(', ')}).`)
  const visiting = new Set<number>(); const visited = new Set<number>()
  const visit = (node: number, path: number[]) => {
    if (visiting.has(node)) { blockers.push(`Supersession cycle detected: ${[...path, node].join(' -> ')}.`); return }
    if (visited.has(node)) return
    visiting.add(node); const next = edges.get(node); if (next !== undefined) visit(next, [...path, node]); visiting.delete(node); visited.add(node)
  }
  for (const source of edges.keys()) visit(source, [])

  return {
    blockers,
    nullFolders: nullFolders.length,
    folderBackfill,
    duplicateConsolidations,
    ruleKeyById,
    supersessionEdges: supersedes.length,
    counts: Object.fromEntries(['documents', 'folders', 'permission_rules', 'document_relationships', 'users', 'characters', 'domain_memberships', 'roles', 'media'].filter((table) => tableExists(db, table)).map((table) => [table, tableCount(db, table)])),
    fingerprints: Object.fromEntries(['documents', 'folders', 'permission_rules', 'document_relationships', 'users', 'characters', 'domain_memberships', 'roles', 'media'].filter((table) => tableExists(db, table)).map((table) => [table, tableFingerprint(db, table)])),
  }
}

const requiredSchema = (db: DatabaseSync) => {
  const errors: string[] = []
  if (!columns(db, 'folders').has('public_access')) errors.push('folders.public_access is missing')
  if (!tableExists(db, 'domain_audit_events')) errors.push('domain_audit_events is missing')
  if (!columns(db, 'permission_rules').has('rule_key')) errors.push('permission_rules.rule_key is missing')
  if (!columns(db, 'document_relationships').has('lock_applied')) errors.push('document_relationships.lock_applied is missing')
  if (!columns(db, 'document_relationships').has('prior_lifecycle')) errors.push('document_relationships.prior_lifecycle is missing')
  for (const index of requiredIndexes) if (!indexExists(db, index)) errors.push(`required index ${index} is missing`)
  for (const trigger of ['documents_folder_required_insert', 'documents_folder_required_update', 'permission_rules_rule_key_required_insert', 'permission_rules_rule_key_required_update']) if (!triggerExists(db, trigger)) errors.push(`required trigger ${trigger} is missing`)
  const nullCount = Number((db.prepare('SELECT count(*) AS count FROM documents WHERE folder_id IS NULL').get() as Row).count)
  if (nullCount !== 0) errors.push(`${nullCount} Document rows still have no Folder`)
  return errors
}

const requiredIndexes = [
  'folders_domain_idx', 'folders_tenant_idx', 'folders_subdomain_idx', 'folders_parent_idx', 'folders_updated_at_idx', 'folders_created_at_idx',
  'documents_domain_idx', 'documents_tenant_idx', 'documents_document_type_idx', 'documents_folder_idx', 'documents_soft_deleted_by_idx', 'documents_created_by_idx', 'documents_updated_at_idx', 'documents_created_at_idx',
  'permission_rules_domain_idx', 'permission_rules_principal_idx', 'permission_rules_resource_idx', 'permission_rules_updated_at_idx', 'permission_rules_created_at_idx', 'permission_rules_rule_key_unique',
  'permission_rules_rels_order_idx', 'permission_rules_rels_parent_idx', 'permission_rules_rels_path_idx',
  'document_relationships_domain_idx', 'document_relationships_source_idx', 'document_relationships_target_idx', 'document_relationships_actor_user_idx', 'document_relationships_actor_character_idx', 'document_relationships_updated_at_idx', 'document_relationships_created_at_idx',
  'document_relationships_supersedes_source_unique', 'document_relationships_supersedes_target_unique',
]

const captureIntegrity = (db: DatabaseSync) => ({
  integrity: (db.prepare('PRAGMA integrity_check').get() as Row).integrity_check,
  foreignKeys: db.prepare('PRAGMA foreign_key_check').all(),
})

const backupDatabase = (db: DatabaseSync): string => {
  const backupPath = explicitBackup ? resolve(process.cwd(), explicitBackup) : join(dirname(dbPath), '.loreforge-backups', `${basename(dbPath, extname(dbPath))}-${MIGRATION_ID}-${new Date().toISOString().replaceAll(/[-:.TZ]/g, '')}.db`)
  if (existsSync(backupPath)) throw new Error(`Refusing to overwrite existing backup ${backupPath}.`)
  mkdirSync(dirname(backupPath), { recursive: true })
  // Checkpoint first.  A busy result means a writer is still active and the
  // migration must be retried after the server is stopped.
  const checkpoint = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').all() as Row[]
  if (checkpoint[0] && Number(checkpoint[0]['busy'] ?? 0) !== 0) throw new Error('SQLite WAL checkpoint is busy; stop all LoreForge writers before applying P05R-T14.')
  db.exec(`VACUUM INTO ${sqlLiteral(backupPath)}`)
  const backup = new DatabaseSync(backupPath, { readOnly: true })
  const integrity = captureIntegrity(backup)
  if (integrity.integrity !== 'ok' || integrity.foreignKeys.length) throw new Error(`Backup integrity check failed for ${backupPath}.`)
  backup.close()
  return backupPath
}

const applyMigration = (db: DatabaseSync, report: ReturnType<typeof preflight>) => {
  db.exec('BEGIN IMMEDIATE')
  try {
    if (!columns(db, 'folders').has('public_access')) db.exec("ALTER TABLE folders ADD COLUMN public_access text NOT NULL DEFAULT 'inherit'")
    if (!tableExists(db, 'domain_audit_events')) {
      db.exec(`CREATE TABLE domain_audit_events (
        id integer PRIMARY KEY NOT NULL,
        domain_id integer NOT NULL,
        event_type text NOT NULL,
        actor_user_id integer,
        actor_character_id integer,
        target_type text NOT NULL,
        target_id text NOT NULL,
        action text NOT NULL,
        occurred_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        context text,
        updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON UPDATE no action ON DELETE set null,
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE set null,
        FOREIGN KEY (actor_character_id) REFERENCES characters(id) ON UPDATE no action ON DELETE set null
      )`)
      db.exec('CREATE INDEX domain_audit_events_domain_target_idx ON domain_audit_events(domain_id, target_type, target_id)')
      db.exec('CREATE INDEX domain_audit_events_event_type_idx ON domain_audit_events(event_type)')
      db.exec('CREATE INDEX domain_audit_events_actor_user_idx ON domain_audit_events(actor_user_id)')
      db.exec('CREATE INDEX domain_audit_events_actor_character_idx ON domain_audit_events(actor_character_id)')
      db.exec('CREATE INDEX domain_audit_events_target_type_idx ON domain_audit_events(target_type)')
      db.exec('CREATE INDEX domain_audit_events_target_id_idx ON domain_audit_events(target_id)')
      db.exec('CREATE INDEX domain_audit_events_occurred_at_idx ON domain_audit_events(occurred_at)')
    }
    if (!columns(db, 'permission_rules').has('rule_key')) db.exec('ALTER TABLE permission_rules ADD COLUMN rule_key text')
    const setRuleKey = db.prepare('UPDATE permission_rules SET rule_key=? WHERE id=?')
    for (const [id, key] of report.ruleKeyById) setRuleKey.run(key, id)
    for (const duplicate of report.duplicateConsolidations) {
      const survivor = duplicate.survivor
      for (const removed of duplicate.removed) {
        if (tableExists(db, 'payload_locked_documents_rels')) db.prepare('UPDATE payload_locked_documents_rels SET permission_rules_id=? WHERE permission_rules_id=?').run(survivor, removed)
        db.prepare('DELETE FROM permission_rules_rels WHERE parent_id=?').run(removed)
        db.prepare('DELETE FROM permission_rules WHERE id=?').run(removed)
      }
    }
    const ordinaryIndexes: Array<[string, string, string]> = [
      ['folders_domain_idx', 'folders', 'domain_id'], ['folders_tenant_idx', 'folders', 'tenant_id'], ['folders_subdomain_idx', 'folders', 'subdomain_id'], ['folders_parent_idx', 'folders', 'parent_id'], ['folders_updated_at_idx', 'folders', 'updated_at'], ['folders_created_at_idx', 'folders', 'created_at'],
      ['documents_domain_idx', 'documents', 'domain_id'], ['documents_tenant_idx', 'documents', 'tenant_id'], ['documents_document_type_idx', 'documents', 'document_type_id'], ['documents_folder_idx', 'documents', 'folder_id'], ['documents_soft_deleted_by_idx', 'documents', 'soft_deleted_by_id'], ['documents_created_by_idx', 'documents', 'created_by_id'], ['documents_updated_at_idx', 'documents', 'updated_at'], ['documents_created_at_idx', 'documents', 'created_at'],
      ['permission_rules_domain_idx', 'permission_rules', 'domain_id'], ['permission_rules_principal_idx', 'permission_rules', 'principal_type'], ['permission_rules_resource_idx', 'permission_rules', 'resource_type'], ['permission_rules_updated_at_idx', 'permission_rules', 'updated_at'], ['permission_rules_created_at_idx', 'permission_rules', 'created_at'],
      ['permission_rules_rels_order_idx', 'permission_rules_rels', '"order"'], ['permission_rules_rels_parent_idx', 'permission_rules_rels', 'parent_id'], ['permission_rules_rels_path_idx', 'permission_rules_rels', 'path'],
      ['document_relationships_domain_idx', 'document_relationships', 'domain_id'], ['document_relationships_source_idx', 'document_relationships', 'source_id'], ['document_relationships_target_idx', 'document_relationships', 'target_id'], ['document_relationships_actor_user_idx', 'document_relationships', 'actor_user_id'], ['document_relationships_actor_character_idx', 'document_relationships', 'actor_character_id'], ['document_relationships_updated_at_idx', 'document_relationships', 'updated_at'], ['document_relationships_created_at_idx', 'document_relationships', 'created_at'],
    ]
    for (const [name, table, field] of ordinaryIndexes) db.exec(`CREATE INDEX IF NOT EXISTS ${q(name)} ON ${q(table)} (${field})`)
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS permission_rules_rule_key_unique ON permission_rules(rule_key)')
    if (!columns(db, 'document_relationships').has('lock_applied')) db.exec('ALTER TABLE document_relationships ADD COLUMN lock_applied integer NOT NULL DEFAULT 0')
    if (!columns(db, 'document_relationships').has('prior_lifecycle')) db.exec('ALTER TABLE document_relationships ADD COLUMN prior_lifecycle text')
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS document_relationships_supersedes_source_unique ON document_relationships(source_id) WHERE kind='supersedes'")
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS document_relationships_supersedes_target_unique ON document_relationships(target_id) WHERE kind='supersedes'")
    for (const backfill of report.folderBackfill) db.prepare('UPDATE documents SET folder_id=? WHERE id=? AND folder_id IS NULL').run(backfill.folderId, backfill.documentId)
    db.exec("CREATE TRIGGER IF NOT EXISTS documents_folder_required_insert BEFORE INSERT ON documents WHEN NEW.folder_id IS NULL BEGIN SELECT RAISE(ABORT, 'Documents.folder is required'); END")
    db.exec("CREATE TRIGGER IF NOT EXISTS documents_folder_required_update BEFORE UPDATE OF folder_id ON documents WHEN NEW.folder_id IS NULL BEGIN SELECT RAISE(ABORT, 'Documents.folder is required'); END")
    db.exec("CREATE TRIGGER IF NOT EXISTS permission_rules_rule_key_required_insert BEFORE INSERT ON permission_rules WHEN NEW.rule_key IS NULL OR NEW.rule_key='' BEGIN SELECT RAISE(ABORT, 'PermissionRules.ruleKey is required'); END")
    db.exec("CREATE TRIGGER IF NOT EXISTS permission_rules_rule_key_required_update BEFORE UPDATE OF rule_key ON permission_rules WHEN NEW.rule_key IS NULL OR NEW.rule_key='' BEGIN SELECT RAISE(ABORT, 'PermissionRules.ruleKey is required'); END")
    db.exec('CREATE TABLE IF NOT EXISTS loreforge_schema_migrations (id text PRIMARY KEY NOT NULL, applied_at text NOT NULL, metadata text NOT NULL)')
    db.prepare('INSERT OR REPLACE INTO loreforge_schema_migrations (id,applied_at,metadata) VALUES (?,?,?)').run(MIGRATION_ID, new Date().toISOString(), JSON.stringify({ folderBackfill: report.folderBackfill, duplicateConsolidations: report.duplicateConsolidations, legacyRelationshipLockMetadata: 'preserved conservatively: lock_applied=0, prior_lifecycle=NULL' }))
    db.exec('COMMIT')
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* preserve original error */ }
    throw error
  }
}

if (!existsSync(dbPath)) throw new Error(`Configured database does not exist: ${dbPath}`)
if (dryRun) {
  const db = new DatabaseSync(dbPath, { readOnly: true })
  const report = preflight(db)
  console.log(JSON.stringify({ migration: MIGRATION_ID, mode: 'dry-run', database: dbPath, currentSchemaErrors: requiredSchema(db), ...report }, null, 2))
  db.close()
  if (report.blockers.length) process.exitCode = 2
} else {
  const db = new DatabaseSync(dbPath)
  try {
    const before = preflight(db)
    if (before.blockers.length) throw new Error(`P05R-T14 preflight blocked:\n${before.blockers.join('\n')}`)
    const backupPath = backupDatabase(db)
    applyMigration(db, before)
    const after = preflight(db)
    const schemaErrors = requiredSchema(db)
    const integrity = captureIntegrity(db)
    const expectedCounts = { ...before.counts, permission_rules: before.counts.permission_rules - before.duplicateConsolidations.reduce((sum, item) => sum + item.removed.length, 0) }
    for (const [table, count] of Object.entries(expectedCounts)) if (after.counts[table] !== count) throw new Error(`Unexpected ${table} count change: ${count} -> ${after.counts[table]}.`)
    for (const table of ['documents', 'folders', 'users', 'characters', 'domain_memberships', 'roles', 'media', 'document_relationships']) if (before.fingerprints[table] && after.fingerprints[table] !== before.fingerprints[table]) throw new Error(`Unexpected content change detected in ${table}.`)
    if (schemaErrors.length || integrity.integrity !== 'ok' || integrity.foreignKeys.length || after.blockers.length) throw new Error(`Post-migration verification failed: ${[...schemaErrors, ...after.blockers, String(integrity.integrity), ...integrity.foreignKeys.map(String)].join('; ')}`)
    console.log(JSON.stringify({ migration: MIGRATION_ID, mode: 'apply', database: dbPath, backupPath, before: { counts: before.counts, fingerprints: before.fingerprints }, after: { counts: after.counts, fingerprints: after.fingerprints }, folderBackfill: before.folderBackfill, duplicateConsolidations: before.duplicateConsolidations, integrity }, null, 2))
  } finally {
    db.close()
  }
}

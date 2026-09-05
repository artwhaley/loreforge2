import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { permissionRuleKey } from '@/collections/PermissionRules'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'
import { CAPABILITIES, isRecordCapability, type Capability, type PrincipalType, type ResourceType } from '@/lib/permissions/capabilities'

type Row = Record<string, unknown> & { id: number | string }

const databaseUri = process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'
const apply = process.argv.includes('--apply')
const dryRun = process.argv.includes('--dry-run') || !apply
if (apply && process.argv.includes('--dry-run')) throw new Error('Choose exactly one migration mode: --dry-run or --apply.')

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P07X-T11 migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P07X-T11 migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

const dbPath = databasePath(databaseUri)
const requiredColumns: Record<string, string[]> = {
  characters: ['kind', 'administrative_domain_id'],
  document_types: ['allow_blank', 'allow_template', 'allow_form', 'draft_folder_id', 'pending_review_folder_id', 'filed_folder_id', 'locked_folder_id'],
  invitations: ['purpose', 'domain_id', 'character_id', 'token_hash', 'issued_by_user_id', 'issued_by_character_id', 'expires_at', 'revoked_at', 'max_uses', 'use_count', 'last_used_at'],
  domain_bootstrap_requests: ['domain_id', 'user_id', 'invitation_id', 'status', 'requested_at'],
  domain_join_requests: ['domain_id', 'user_id', 'invitation_id', 'character_id', 'requested_name', 'status', 'requested_at'],
}

function inspectSchema(db: DatabaseSync) {
  const missingTables: string[] = []
  const missingColumns: string[] = []
  const tableExists = (table: string) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
  for (const [table, columns] of Object.entries(requiredColumns)) {
    if (!tableExists(table)) {
      missingTables.push(table)
      continue
    }
    const actual = new Set((db.prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all() as Array<{ name: string }>).map((row) => row.name))
    for (const column of columns) if (!actual.has(column)) missingColumns.push(`${table}.${column}`)
  }
  return { ready: missingTables.length === 0 && missingColumns.length === 0, missingTables, missingColumns }
}

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null) {
    const row = value as Record<string, unknown>
    if ('value' in row && 'relationTo' in row) return idOf(row.value)
    if ('id' in row) return Number(row.id)
  }
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

const relationName = (value: unknown): string | null => value && typeof value === 'object' && 'relationTo' in value ? String((value as { relationTo?: unknown }).relationTo ?? '') || null : null
const relationCollection = (type: PrincipalType | ResourceType): string => ({
  Character: 'characters', User: 'users', Role: 'roles', DomainMembership: 'domain-memberships',
  Domain: 'domains', Subdomain: 'subdomains', Folder: 'folders', Document: 'documents', DocumentType: 'document-types',
} as Record<string, string>)[type]

function runSchemaApply(): void {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/scripts/migrateP07XSchema.ts'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
}

const explicitNpcNames = new Set(['NPC Villager', 'NPC Guard'])
const recordCapabilities = CAPABILITIES.filter(isRecordCapability)

async function run() {
  if (apply) {
    if (!existsSync(dbPath)) throw new Error(`Configured database does not exist: ${dbPath}. Initialize it with Payload before applying P07X-T11.`)
    runSchemaApply()
  }

  if (!existsSync(dbPath)) {
    console.log(JSON.stringify({ migration: 'P07X-T11', mode: dryRun ? 'dry-run' : 'apply', database: dbPath, schema: { ready: false, missingTables: Object.keys(requiredColumns), missingColumns: [] }, blockers: ['Configured database does not exist.'], changes: [] }, null, 2))
    process.exitCode = 2
    return
  }

  const schemaDb = new DatabaseSync(dbPath, { readOnly: true })
  const schema = inspectSchema(schemaDb)
  schemaDb.close()
  if (!schema.ready) {
    console.log(JSON.stringify({ migration: 'P07X-T11', mode: dryRun ? 'dry-run' : 'apply', database: dbPath, schema, blockers: ['P07X schema is incomplete; no data changes were attempted.'], changes: [] }, null, 2))
    process.exitCode = 2
    return
  }

  // A dry run is read-only at both the SQLite and Payload layers, even if the
  // caller inherited PAYLOAD_PUSH=true from another local command.
  if (dryRun) process.env.PAYLOAD_PUSH = 'false'
  const payload = await getPayload({ config })
  const changes: Array<Record<string, unknown>> = []
  const warnings: string[] = []

  const characters = await payload.find({ collection: 'characters', depth: 0, limit: 0, pagination: false, overrideAccess: true })
  for (const character of characters.docs as unknown as Array<Row & { name?: string; kind?: unknown }>) {
    const current = String(character.kind ?? '')
    const desired = explicitNpcNames.has(String(character.name ?? '')) ? 'npc' : ['player', 'npc', 'domain_admin', 'platform_admin'].includes(current) ? current : 'player'
    if (current === desired) continue
    changes.push({ kind: 'character-kind', id: character.id, name: character.name, from: current || null, to: desired })
    if (apply) await payload.update({ collection: 'characters', id: character.id, overrideAccess: true, data: { kind: desired } as never })
  }

  const platformUsers = await payload.find({ collection: 'users', where: { isPlatformAdmin: { equals: true } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  for (const user of platformUsers.docs) {
    const existing = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'platform_admin' } }, { controlledBy: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (!existing.docs[0]) changes.push({ kind: 'platform-admin-provision', userId: user.id, action: 'create' })
    if (apply) await ensurePlatformAdminIdentity(payload, Number(user.id))
  }

  const domains = await payload.find({ collection: 'domains', depth: 0, limit: 0, pagination: false, overrideAccess: true })
  for (const domain of domains.docs as unknown as Array<Row & { name?: string; kind?: unknown; ownerUser?: unknown }>) {
    if (String(domain.kind ?? 'community') !== 'community') continue
    const ownerId = idOf(domain.ownerUser)
    if (ownerId == null) {
      warnings.push(`Community Domain ${domain.id} "${String(domain.name ?? '')}" is ownerless; only setup-pending lifecycle may remain ownerless.`)
      continue
    }
    const existing = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: domain.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (!existing.docs[0]) changes.push({ kind: 'domain-admin-provision', domainId: domain.id, action: 'create' })
    if (apply) await ensureDomainAdminIdentity(payload, Number(domain.id))
  }

  const legacyAdmins = await payload.find({ collection: 'domain-admins', depth: 1, limit: 0, pagination: false, overrideAccess: true }).catch(() => ({ docs: [] as never[] }))
  let legacyOwnerDuplicates = 0
  let legacyForeign = 0
  for (const row of legacyAdmins.docs as unknown as Array<Row & { domain?: unknown; user?: unknown }>) {
    const domain = row.domain && typeof row.domain === 'object' ? row.domain as { id?: number | string; ownerUser?: unknown } : null
    const ownerId = idOf(domain?.ownerUser)
    const userId = idOf(row.user)
    if (ownerId != null && userId === ownerId) {
      legacyOwnerDuplicates += 1
    } else {
      legacyForeign += 1
      warnings.push(`Legacy domain-admins row ${row.id} for Domain ${String(domain?.id ?? row.domain)} and User ${String(userId ?? row.user)} is incompatible with one-owner authority; reported only.`)
    }
  }

  const rules = await payload.find({ collection: 'permission-rules', depth: 1, limit: 0, pagination: false, overrideAccess: true })
  let typeRulesVerified = 0
  let typeRuleErrors = 0
  let folderRecordGrants = 0
  let folderRecordDenies = 0
  let ambiguousFolderRules = 0
  let translatedFolderRules = 0
  const types = new Map<number, Row>()
  const allTypes = await payload.find({ collection: 'document-types', depth: 0, limit: 0, pagination: false, overrideAccess: true })
  for (const type of allTypes.docs as unknown as Row[]) types.set(Number(type.id), type)
  const domainsById = new Map<number, Row>(domains.docs.map((domain) => [Number(domain.id), domain as unknown as Row]))
  for (const raw of rules.docs as unknown as Array<Row & { resourceType?: unknown; resource?: unknown; principalType?: unknown; principal?: unknown; capability?: unknown; effect?: unknown; domain?: unknown; actorUser?: unknown; active?: unknown }>) {
    const resourceType = String(raw.resourceType ?? '') as ResourceType
    const capability = String(raw.capability ?? '') as Capability
    if (resourceType === 'DocumentType') {
      const typeId = idOf(raw.resource)
      const relation = relationName(raw.resource)
      const domainId = idOf(raw.domain)
      const typeDomain = typeId == null ? null : idOf(types.get(typeId)?.domain)
      if (relation !== 'document-types' || typeId == null || domainId == null || typeDomain !== domainId) {
        typeRuleErrors += 1
        warnings.push(`DocumentType PermissionRule ${raw.id} has an invalid polymorphic relation or cross-Domain target; left unchanged.`)
      } else {
        typeRulesVerified += 1
      }
      continue
    }
    if (resourceType !== 'Folder' || !isRecordCapability(capability)) continue
    if (String(raw.effect ?? 'grant') === 'deny') {
      folderRecordDenies += 1
      continue
    }
    folderRecordGrants += 1
    const domainId = idOf(raw.domain)
    const folderId = idOf(raw.resource)
    if (domainId == null || folderId == null || !['Character', 'User', 'Role', 'DomainMembership'].includes(String(raw.principalType)) || relationName(raw.principal) !== relationCollection(String(raw.principalType) as PrincipalType)) {
      ambiguousFolderRules += 1
      warnings.push(`Folder PermissionRule ${raw.id} has no deterministic Domain/Folder/principal mapping; reported only.`)
      continue
    }
    const folderDocs = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { folder: { equals: folderId } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    const candidateTypes = [...new Set(folderDocs.docs.map((document) => idOf(document.documentType)).filter((id): id is number => id != null))]
    if (candidateTypes.length !== 1) {
      ambiguousFolderRules += 1
      warnings.push(`Folder grant ${raw.id} is ambiguous: candidate Document Types ${candidateTypes.length ? candidateTypes.join(', ') : '(none)'}. No broad Type grant guessed.`)
      continue
    }
    const typeId = candidateTypes[0]
    const principalType = String(raw.principalType) as PrincipalType
    const principalId = idOf(raw.principal)
    if (principalId == null) {
      ambiguousFolderRules += 1
      warnings.push(`Folder grant ${raw.id} has no resolvable principal; reported only.`)
      continue
    }
    const ruleKey = permissionRuleKey({ domainId, principalType, principalRelation: relationCollection(principalType), principalId, resourceType: 'DocumentType', resourceRelation: 'document-types', resourceId: typeId, capability })
    const equivalent = await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })
    if (equivalent.docs[0]) continue
    const typeName = String(types.get(typeId)?.name ?? `Type ${typeId}`)
    changes.push({ kind: 'folder-to-type-rule', folderRuleId: raw.id, domainId, principalType, principalId, capability, documentTypeId: typeId, documentTypeName: typeName })
    translatedFolderRules += 1
    if (apply) {
      const actorUser = idOf(raw.actorUser) ?? idOf(domainsById.get(domainId)?.ownerUser)
      if (actorUser == null) {
        warnings.push(`Folder grant ${raw.id} had no actor User; deterministic Type translation was reported but not applied.`)
        continue
      }
      await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { ruleKey, domain: domainId, principalType, principal: { relationTo: relationCollection(principalType), value: principalId }, resourceType: 'DocumentType', resource: { relationTo: 'document-types', value: typeId }, capability, effect: 'grant', active: raw.active === false ? false : true, actorUser, actorCharacter: idOf((raw as { actorCharacter?: unknown }).actorCharacter) ?? undefined } as never })
    }
  }

  const templates = await payload.find({ collection: 'templates', depth: 0, limit: 0, pagination: false, overrideAccess: true })
  const forms = await payload.find({ collection: 'forms', depth: 0, limit: 0, pagination: false, overrideAccess: true }).catch(() => ({ docs: [] as never[] }))
  const deprecatedDestinationFields = templates.docs.filter((template) => template.destinationFolder != null || template.allowDestinationOverride === true).length
  console.log(JSON.stringify({
    migration: 'P07X-T11',
    mode: dryRun ? 'dry-run' : 'apply',
    database: dbPath,
    schema,
    changes,
    warnings,
    report: {
      characterRows: characters.docs.length,
      platformAdminUsers: platformUsers.docs.length,
      communityDomains: domains.docs.filter((domain) => String((domain as { kind?: unknown }).kind ?? 'community') === 'community').length,
      legacyDomainAdminRows: legacyAdmins.docs.length,
      legacyOwnerDuplicates,
      legacyForeign,
      typeRulesVerified,
      typeRuleErrors,
      folderRecordGrants,
      folderRecordDenies,
      ambiguousFolderRules,
      translatedFolderRules,
      templatesPreserved: templates.docs.length,
      formsPreserved: forms.docs.length,
      deprecatedDestinationFields,
      destinationPolicy: 'Document Type owns new creation routing; legacy Template destination fields are retained read-only/hidden for compatibility.',
    },
  }, null, 2))
}

await run()

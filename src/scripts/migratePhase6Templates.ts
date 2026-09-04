import { getPayload } from 'payload'
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

import config from '@/payload.config'
import { adaptPayloadForm } from '@/lib/forms/adapter-payload'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('P06 template migration only supports a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('P06 template migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

/** Add only the Templates table/indexes; never use Payload's destructive dev push. */
function ensureTemplateSchema() {
  const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS templates (
      id integer PRIMARY KEY NOT NULL,
      domain_id integer NOT NULL,
      document_type_id integer NOT NULL,
      name text NOT NULL,
      kind text DEFAULT 'document' NOT NULL,
      scope_folder_id integer NOT NULL,
      destination_folder_id integer NOT NULL,
      allow_destination_override integer DEFAULT false,
      available_to_descendants integer DEFAULT true,
      base_template_id integer,
      title_template text NOT NULL,
      body_template text NOT NULL,
      form_schema text,
      lifecycle_policy text DEFAULT 'inherit' NOT NULL,
      active integer DEFAULT true,
      version numeric DEFAULT 1 NOT NULL,
      updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (scope_folder_id) REFERENCES folders(id) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (destination_folder_id) REFERENCES folders(id) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (base_template_id) REFERENCES templates(id) ON UPDATE no action ON DELETE set null
    )`)
    for (const [name, columns] of [
      ['templates_domain_idx', 'domain_id'], ['templates_document_type_idx', 'document_type_id'],
      ['templates_scope_folder_idx', 'scope_folder_id'], ['templates_destination_folder_idx', 'destination_folder_id'],
      ['templates_base_template_idx', 'base_template_id'], ['templates_created_at_idx', 'created_at'], ['templates_updated_at_idx', 'updated_at'],
    ]) db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON templates (${columns})`)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally { db.close() }
}

ensureTemplateSchema()

/**
 * One-way, idempotent migration from the spike Form Builder records to
 * LoreForge Templates. It copies only the supported neutral schema; warnings
 * are printed and the imported Template remains inactive when a legacy field
 * cannot be represented safely.
 */
const payload = await getPayload({ config })
const domains = await payload.find({ collection: 'domains', depth: 0, limit: 10000, overrideAccess: true })
const domainById = new Map(domains.docs.map((domain) => [Number(domain.id), domain]))
const domainBySlug = new Map(domains.docs.map((domain) => [domain.slug, domain]))
const legacyTenants = await payload.find({ collection: 'tenants', depth: 0, limit: 10000, overrideAccess: true }).catch(() => ({ docs: [] as never[] }))
const forms = await payload.find({ collection: 'forms', depth: 0, limit: 10000, overrideAccess: true })
let imported = 0
let skipped = 0

// Plain Text is an ordinary, flexible Domain template rather than a hidden
// special case in the document editor. Seed it at every Domain root so the
// searchable chooser always has a neutral blank option.
for (const domain of domains.docs) {
  const folders = await payload.find({ collection: 'folders', where: { domain: { equals: domain.id } }, depth: 0, limit: 10000, overrideAccess: true })
  let root = folders.docs.find((folder) => Boolean(folder.systemManaged) && !folder.parent)
  if (!root) {
    root = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domain.id, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })
    payload.logger.info(`P06 migration created missing Domain root Folder ${root.id} for Domain ${domain.id}.`)
  }
  let type = (await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domain.id } }, { name: { equals: 'Plain Text' } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  if (!type) type = await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domain.id, name: 'Plain Text', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } })
  const existing = (await payload.find({ collection: 'templates', where: { and: [{ domain: { equals: domain.id } }, { name: { equals: 'Plain Text' } }, { kind: { equals: 'document' } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  const data = { domain: domain.id, documentType: type.id, name: 'Plain Text', kind: 'document' as const, scopeFolder: root.id, destinationFolder: root.id, allowDestinationOverride: true, availableToDescendants: true, baseTemplate: null, titleTemplate: 'Plain Text', bodyTemplate: '{{content}}', lifecyclePolicy: 'inherit' as const, active: true, version: Number(existing?.version ?? 1) }
  if (existing) await payload.update({ collection: 'templates', id: existing.id, overrideAccess: true, data })
  else await payload.create({ collection: 'templates', overrideAccess: true, data })
}

for (const form of forms.docs) {
  const legacyTenantId = idOf((form as { tenant?: unknown }).tenant)
  const explicitDomainId = idOf((form as { domain?: unknown }).domain)
  const legacyTenant = legacyTenants.docs.find((tenant) => Number(tenant.id) === legacyTenantId)
  const domain = (explicitDomainId ? domainById.get(explicitDomainId) : undefined) ?? (legacyTenant ? domainBySlug.get(legacyTenant.slug) : undefined)
  if (!domain) {
    skipped += 1
    payload.logger.warn(`P06 migration skipped Form ${form.id}: no matching Domain.`)
    continue
  }
  const rawFolder = idOf((form as { folder?: unknown }).folder)
  const folders = await payload.find({ collection: 'folders', where: { domain: { equals: domain.id } }, depth: 0, limit: 10000, overrideAccess: true })
  const root = folders.docs.find((folder) => folder.systemManaged && !folder.parent)
  const destinationId = rawFolder && folders.docs.some((folder) => Number(folder.id) === rawFolder) ? rawFolder : Number(root?.id ?? 0)
  if (!destinationId) {
    skipped += 1
    payload.logger.warn(`P06 migration skipped Form ${form.id}: Domain has no root Folder.`)
    continue
  }
  const name = String((form as { title?: unknown }).title ?? `Imported Form ${form.id}`).trim()
  let type = (await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domain.id } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  if (!type) type = await payload.create({ collection: 'document-types', overrideAccess: true, data: { domain: domain.id, name, active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } })
  const adapted = adaptPayloadForm(form as unknown as { fields?: unknown })
  for (const warning of adapted.warnings) payload.logger.warn(`P06 migration Form ${form.id}: ${warning}`)
  const archive = (form as { archive?: { titleTemplate?: string; markdownTemplate?: string } }).archive
  const existing = (await payload.find({ collection: 'templates', where: { and: [{ domain: { equals: domain.id } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  const data = {
    domain: domain.id,
    documentType: type.id,
    name,
    kind: 'form' as const,
    scopeFolder: destinationId,
    destinationFolder: destinationId,
    availableToDescendants: true,
    allowDestinationOverride: false,
    titleTemplate: String(archive?.titleTemplate ?? name),
    bodyTemplate: String(archive?.markdownTemplate ?? ''),
    formSchema: adapted.schema,
    lifecyclePolicy: 'inherit' as const,
    active: adapted.warnings.length === 0,
    version: 1,
  }
  if (existing) await payload.update({ collection: 'templates', id: existing.id, overrideAccess: true, data })
  else await payload.create({ collection: 'templates', overrideAccess: true, data })
  imported += 1
}

payload.logger.info(`P06 template migration complete: imported=${imported} skipped=${skipped}`)
process.exitCode = skipped > 0 ? 1 : 0

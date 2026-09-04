import { getPayload } from 'payload'

import config from '@/payload.config'
import { adaptPayloadForm } from '@/lib/forms/adapter-payload'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

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


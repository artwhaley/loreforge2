import { createHash } from 'node:crypto'

import { getPayload } from 'payload'

import config from '@/payload.config'

const relationId = (value: unknown): number =>
  typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)

const bodyHash = (body: unknown) => createHash('sha256').update(String(body ?? '')).digest('hex')

const payload = await getPayload({ config })
const legacyTenants = await payload.find({ collection: 'tenants', depth: 0, limit: 500, sort: 'id' })
const existingDomains = await payload.find({ collection: 'domains', depth: 0, limit: 500, sort: 'id' })
const domainsBySlug = new Map(existingDomains.docs.map((domain) => [domain.slug, domain]))
const mappings = new Map<number, number>()

for (const tenant of legacyTenants.docs) {
  const legacyMemberships = await payload.find({
    collection: 'memberships',
    where: { and: [{ tenant: { equals: tenant.id } }, { role: { equals: 'admin' } }] },
    depth: 0,
    limit: 20,
  })
  const ownerUser = legacyMemberships.docs[0] ? relationId(legacyMemberships.docs[0].user) : undefined
  if (!ownerUser) throw new Error(`Cannot migrate ${tenant.slug}: no legacy admin membership can become ownerUser.`)

  const existing = domainsBySlug.get(tenant.slug)
  const domain = existing
    ? await payload.update({
        collection: 'domains',
        id: existing.id,
        data: { ownerUser, ownerCharacter: null, kind: 'community', lifecycle: 'active' },
        depth: 0,
      })
    : await payload.create({
        collection: 'domains',
        draft: false,
        data: {
          name: tenant.name,
          slug: tenant.slug,
          motto: tenant.motto,
          kind: 'community',
          ownerUser,
          ownerCharacter: null,
          lifecycle: 'active',
          defaultFilingPolicy: 'direct-file',
          preset: tenant.preset,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          accentColor: tenant.accentColor,
          backgroundColor: tenant.backgroundColor,
          headingFontKey: tenant.headingFontKey,
          bodyFontKey: tenant.bodyFontKey,
          logo: tenant.logo ? relationId(tenant.logo) : null,
          banner: tenant.banner ? relationId(tenant.banner) : null,
          publicEnabled: false,
        },
        depth: 0,
      })
  mappings.set(Number(tenant.id), Number(domain.id))
  domainsBySlug.set(tenant.slug, domain)

  for (const legacyMembership of legacyMemberships.docs) {
    const userId = relationId(legacyMembership.user)
    const admins = await payload.find({
      collection: 'domain-admins',
      where: { and: [{ domain: { equals: domain.id } }, { user: { equals: userId } }] },
      depth: 0,
      limit: 1,
    })
    if (!admins.docs[0]) {
      await payload.create({ collection: 'domain-admins', data: { domain: domain.id, user: userId, status: 'active', addedBy: ownerUser } })
    }
  }
}

const updateDomainRelation = async (collection: string, doc: Record<string, unknown>) => {
  const legacy = doc.tenant
  // Phase 3-created records (for example Ar's new Subdomain folders) are
  // already canonical and intentionally have no legacy Tenant relation.
  if (legacy === null || legacy === undefined) {
    if (doc.domain !== null && doc.domain !== undefined) return false
    throw new Error(`${collection}/${String(doc.id)} has neither a legacy Tenant nor a Domain relation.`)
  }
  const domainId = mappings.get(relationId(legacy))
  if (!domainId) throw new Error(`${collection}/${String(doc.id)} references an unmapped Tenant.`)
  if (relationId(doc.domain) === domainId) return false
  await payload.update({ collection: collection as never, id: doc.id as never, data: { domain: domainId } as never, depth: 0 })
  return true
}

// Create a durable system root before enforcing the one-Folder-per-Document
// contract. This keeps documents that were previously filed at a nullable
// tenant root addressable while preserving every existing folder reference.
const rootByDomain = new Map<number, number>()
for (const [legacyTenantId, domainId] of mappings) {
  const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1 })
  const root = roots.docs[0] ?? await payload.create({ collection: 'folders', draft: false, data: { domain: domainId, tenant: legacyTenantId, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit' }, depth: 0 })
  rootByDomain.set(domainId, Number(root.id))
}

const relationCollections = ['documents', 'folders', 'pages', 'forms', 'domain-memberships', 'domain-character-contexts', 'character-claim-requests', 'character-merge-requests']
let updated = 0
for (const collection of relationCollections) {
  const result = await payload.find({ collection: collection as never, depth: 0, limit: 1000 })
  for (const doc of result.docs as unknown as Array<Record<string, unknown>>) {
    if (await updateDomainRelation(collection, doc)) updated += 1
  }
}

const unfiledDocuments = await payload.find({ collection: 'documents', depth: 0, limit: 1000 })
for (const document of unfiledDocuments.docs) {
  const domainId = relationId(document.domain)
  const rootId = rootByDomain.get(domainId)
  if (rootId && !document.folder) await payload.update({ collection: 'documents', id: document.id, data: { folder: rootId }, depth: 0 })
}

const documents = await payload.find({ collection: 'documents', depth: 0, limit: 1000 })
const postHashes = documents.docs.map((document) => bodyHash(document.body)).sort()
const expectedDocumentCount = documents.totalDocs
const mappedTenantCount = mappings.size
if (expectedDocumentCount !== documents.docs.length) throw new Error('Document reconciliation exceeded the migration page size.')

console.log(JSON.stringify({
  migration: 'phase-3-tenant-to-domain',
  legacyTenantCount: legacyTenants.totalDocs,
  domainCount: mappings.size,
  mappedRelations: updated,
  documentCount: expectedDocumentCount,
  documentBodyHashes: postHashes,
  accountedLegacyTenantIds: [...mappings.keys()].sort((a, b) => a - b),
  accountedDomainIds: [...mappings.values()].sort((a, b) => a - b),
  status: mappedTenantCount === legacyTenants.totalDocs ? 'PASS' : 'FAIL',
}, null, 2))

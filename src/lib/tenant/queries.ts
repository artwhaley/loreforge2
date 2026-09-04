import type { Where } from 'payload'

import { getLorePayload } from '@/lib/payload'

import type { Character, Document, Domain, DomainMembership, Folder, Page, Tenant, Template } from '@/payload-types'

import { domainAndIdWhere, domainWhere } from './scope'

type DomainRecord = Domain | Tenant
const domainId = (domain: DomainRecord) => Number(domain.id)
const notDeletedWhere: Where = { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }

/**
 * Tenant-scoped data access.
 *
 * Every tenant-owned query in the application goes through helpers like this
 * so the tenant condition cannot be forgotten at the call site (spec §8).
 */
export async function getDocumentsForTenant(tenant: DomainRecord): Promise<Document[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'documents',
    where: domainWhere(domainId(tenant), notDeletedWhere),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

export async function getDocumentForTenant(
  tenant: DomainRecord,
  documentId: number | string,
  options?: { includeDeleted?: boolean },
): Promise<Document | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'documents',
    where: options?.includeDeleted ? domainAndIdWhere(domainId(tenant), documentId) : domainWhere(domainId(tenant), { and: [{ id: { equals: documentId } }, notDeletedWhere] }),
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

/** Form Templates owned by the Domain (neutral LoreForge schema). */
export async function getFormsForTenant(tenant: DomainRecord): Promise<Template[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'templates',
    where: domainWhere(domainId(tenant), { kind: { equals: 'form' } }),
    depth: 1,
    limit: 100,
    sort: 'title',
  })
  return result.docs
}

export async function getFormForTenant(
  tenant: DomainRecord,
  formId: number,
): Promise<Template | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'templates',
    where: { and: [domainAndIdWhere(domainId(tenant), formId), { kind: { equals: 'form' } }] },
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getFoldersForTenant(tenant: DomainRecord): Promise<Folder[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'folders',
    where: domainWhere(domainId(tenant)),
    depth: 1,
    limit: 0,
    pagination: false,
    sort: 'name',
  })
  return result.docs
}

export async function getFolderForTenant(
  tenant: DomainRecord,
  folderId: number | string,
): Promise<Folder | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'folders',
    where: domainAndIdWhere(domainId(tenant), folderId),
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

/** Documents filed directly in a folder (folderId null = archive root). */
export async function getDocumentsForFolder(
  tenant: DomainRecord,
  folderId: number | string | null,
): Promise<Document[]> {
  const payload = await getLorePayload()
  const folderWhere: Where =
    folderId === null
      ? {
          or: [{ folder: { equals: null } }, { folder: { exists: false } }],
        }
      : { folder: { equals: folderId } }
  const result = await payload.find({
    collection: 'documents',
    where: domainWhere(domainId(tenant), { and: [folderWhere, notDeletedWhere] }),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

/** Tenant-scoped search over title and Markdown body (spec §7.5). */
export async function searchDocumentsForTenant(tenant: DomainRecord, query: string): Promise<Document[]> {
  const q = query.trim()
  if (!q) return []
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'documents',
    where: domainWhere(domainId(tenant), { and: [notDeletedWhere, { or: [{ title: { like: q } }, { body: { like: q } }] }] }),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

export async function getPageForTenant(tenant: DomainRecord, slug: string): Promise<Page | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'pages',
    where: {
      and: [{ domain: { equals: domainId(tenant) } }, { slug: { equals: slug } }],
    },
    depth: 0,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getTenantsForUser(userId: number | string): Promise<DomainRecord[]> {
  const payload = await getLorePayload()
  // P07P-02: one unbounded memberships query replaces one query per controlled
  // Character, and unbounded pagination removes the silent caps (owner
  // decision 2026-09-04: aggregates must be complete across many Domains).
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: {
      and: [
        { status: { equals: 'active' } },
        { 'character.controlledBy': { equals: userId } },
        { 'character.status': { equals: 'active' } },
      ],
    },
    depth: 1,
    limit: 0,
    pagination: false,
  })
  const tenantsById = new Map<string, DomainRecord>()
  for (const membership of memberships.docs) {
    const tenant = membership.domain ?? membership.tenant
    if (tenant && typeof tenant === 'object') tenantsById.set(String(tenant.id), tenant as DomainRecord)
  }
  // User-level ownership/administration is a Domain relationship, not a
  // substitute Character membership. It still belongs in the one selector.
  const managed = await getAdministrationDomainsForUser(userId)
  for (const tenant of managed) tenantsById.set(String(tenant.id), tenant)
  return [...tenantsById.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** User-level Administration domains, intentionally separate from Character membership. */
export async function getAdministrationDomainsForUser(userId: number | string): Promise<DomainRecord[]> {
  const payload = await getLorePayload()
  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  if (user.isPlatformAdmin) return (await payload.find({ collection: 'domains', depth: 0, limit: 0, pagination: false })).docs
  const owned = await payload.find({ collection: 'domains', where: { 'ownerUser': { equals: userId } }, depth: 0, limit: 0, pagination: false })
  const adminRows = await payload.find({ collection: 'domain-admins', where: { and: [{ user: { equals: userId } }, { status: { equals: 'active' } }] }, depth: 1, limit: 0, pagination: false })
  const byId = new Map<string, DomainRecord>()
  for (const domain of owned.docs) byId.set(String(domain.id), domain)
  for (const row of adminRows.docs) if (row.domain && typeof row.domain === 'object') byId.set(String(row.domain.id), row.domain as DomainRecord)
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Active Characters the User controls who are members of a Domain. */
export async function getCharactersForTenant(
  tenant: DomainRecord,
  userId: number | string,
): Promise<Character[]> {
  const payload = await getLorePayload()
  // P07P-02: memberships for the one Domain in a single unbounded query; the
  // controller filter stays in memory on the populated relation.
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: {
      and: [{ or: [{ domain: { equals: domainId(tenant) } }, { tenant: { equals: domainId(tenant) } }] }, { status: { equals: 'active' } }],
    },
    depth: 1,
    limit: 0,
    pagination: false,
  })
  return memberships.docs
    .map((membership) => membership.character)
    .filter((character): character is Character => {
      if (!character || typeof character !== 'object' || character.status !== 'active') return false
      const controlledBy = character.controlledBy
      const controllerId = typeof controlledBy === 'object' ? controlledBy?.id : controlledBy
      return String(controllerId) === String(userId)
    })
}

export async function getDomainMembershipsForTenant(tenant: DomainRecord): Promise<DomainMembership[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'domain-memberships',
    where: { or: [{ domain: { equals: domainId(tenant) } }, { tenant: { equals: domainId(tenant) } }] },
    depth: 1,
    limit: 0,
    pagination: false,
    sort: 'updatedAt',
  })
  return result.docs
}

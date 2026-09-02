import type { Where } from 'payload'

import { getLorePayload } from '@/lib/payload'

import type { Character, Document, DomainMembership, Folder, Form, Page, Tenant } from '@/payload-types'

import { tenantAndIdWhere, tenantWhere } from './scope'

/**
 * Tenant-scoped data access.
 *
 * Every tenant-owned query in the application goes through helpers like this
 * so the tenant condition cannot be forgotten at the call site (spec §8).
 */
export async function getDocumentsForTenant(tenant: Tenant): Promise<Document[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'documents',
    where: tenantWhere(tenant.id),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

export async function getDocumentForTenant(
  tenant: Tenant,
  documentId: number | string,
): Promise<Document | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'documents',
    where: tenantAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  return result.docs[0] ?? null
}

/** Forms owned by the tenant (structured report templates). */
export async function getFormsForTenant(tenant: Tenant): Promise<Form[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'forms',
    where: tenantWhere(tenant.id),
    depth: 0,
    limit: 100,
    sort: 'title',
  })
  return result.docs
}

export async function getFormForTenant(
  tenant: Tenant,
  formId: number,
): Promise<Form | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'forms',
    where: tenantAndIdWhere(tenant.id, formId),
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getFoldersForTenant(tenant: Tenant): Promise<Folder[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'folders',
    where: tenantWhere(tenant.id),
    depth: 1,
    limit: 200,
    sort: 'name',
  })
  return result.docs
}

export async function getFolderForTenant(
  tenant: Tenant,
  folderId: number | string,
): Promise<Folder | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'folders',
    where: tenantAndIdWhere(tenant.id, folderId),
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

/** Documents filed directly in a folder (folderId null = archive root). */
export async function getDocumentsForFolder(
  tenant: Tenant,
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
    where: tenantWhere(tenant.id, folderWhere),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

/** Tenant-scoped search over title and Markdown body (spec §7.5). */
export async function searchDocumentsForTenant(tenant: Tenant, query: string): Promise<Document[]> {
  const q = query.trim()
  if (!q) return []
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'documents',
    where: tenantWhere(tenant.id, {
      or: [{ title: { like: q } }, { body: { like: q } }],
    }),
    depth: 0,
    limit: 100,
    sort: '-updatedAt',
  })
  return result.docs
}

export async function getPageForTenant(tenant: Tenant, slug: string): Promise<Page | null> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'pages',
    where: {
      and: [{ tenant: { equals: tenant.id } }, { slug: { equals: slug } }],
    },
    depth: 0,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getTenantsForUser(userId: number | string): Promise<Tenant[]> {
  const payload = await getLorePayload()
  const characters = await payload.find({
    collection: 'characters',
    where: {
      and: [{ controlledBy: { equals: userId } }, { status: { equals: 'active' } }],
    },
    depth: 0,
    limit: 100,
  })
  if (characters.docs.length === 0) return []

  const membershipResults = await Promise.all(
    characters.docs.map((character) =>
      payload.find({
        collection: 'domain-memberships',
        where: {
          and: [{ character: { equals: character.id } }, { status: { equals: 'active' } }],
        },
        depth: 1,
        limit: 100,
      }),
    ),
  )
  const tenantsById = new Map<string, Tenant>()
  for (const result of membershipResults) {
    for (const membership of result.docs) {
      const tenant = membership.tenant
      if (tenant && typeof tenant === 'object') tenantsById.set(String(tenant.id), tenant as Tenant)
    }
  }
  return [...tenantsById.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Active Characters the User controls who are members of a Domain. */
export async function getCharactersForTenant(
  tenant: Tenant,
  userId: number | string,
): Promise<Character[]> {
  const payload = await getLorePayload()
  const memberships = await payload.find({
    collection: 'domain-memberships',
    where: {
      and: [{ tenant: { equals: tenant.id } }, { status: { equals: 'active' } }],
    },
    depth: 1,
    limit: 200,
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

export async function getDomainMembershipsForTenant(tenant: Tenant): Promise<DomainMembership[]> {
  const payload = await getLorePayload()
  const result = await payload.find({
    collection: 'domain-memberships',
    where: { tenant: { equals: tenant.id } },
    depth: 1,
    limit: 200,
    sort: 'updatedAt',
  })
  return result.docs
}

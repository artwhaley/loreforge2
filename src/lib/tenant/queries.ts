import { getPayload } from 'payload'
import type { Where } from 'payload'

import config from '@/payload.config'

import type { Document, Folder, Form, Page, Tenant } from '@/payload-types'

import { tenantAndIdWhere, tenantWhere } from './scope'

/**
 * Tenant-scoped data access.
 *
 * Every tenant-owned query in the application goes through helpers like this
 * so the tenant condition cannot be forgotten at the call site (spec §8).
 */
export async function getDocumentsForTenant(tenant: Tenant): Promise<Document[]> {
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'forms',
    where: tenantAndIdWhere(tenant.id, formId),
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function getFoldersForTenant(tenant: Tenant): Promise<Folder[]> {
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
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
  const payload = await getPayload({ config })
  const memberships = await payload.find({
    collection: 'memberships',
    where: { user: { equals: userId } },
    depth: 1,
    limit: 50,
  })
  return memberships.docs
    .map((m) => m.tenant as Tenant)
    .filter((t): t is Tenant => Boolean(t && typeof t === 'object'))
}

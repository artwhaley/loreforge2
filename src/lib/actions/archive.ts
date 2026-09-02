'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'

import config from '@/payload.config'

import { tenantAndIdWhere } from '@/lib/tenant/scope'

type MemberTenant = {
  payload: Awaited<ReturnType<typeof getPayload>>
  user: { id: number }
  tenant: { id: number; slug: string }
}

/** Resolve the active user and a tenant they are a member of, or null. */
async function getMemberTenant(tenantSlug: string): Promise<MemberTenant | null> {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) return null

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) return null

  const memberships = await payload.find({
    collection: 'memberships',
    where: {
      and: [{ user: { equals: user.id } }, { tenant: { equals: tenant.id } }],
    },
    depth: 0,
    limit: 1,
  })
  if (!memberships.docs[0]) return null

  return { payload, user: { id: Number(user.id) }, tenant: { id: tenant.id, slug: tenant.slug } }
}

/** Verify a folder belongs to the tenant, returning its id or null. */
async function tenantFolderId(
  payload: MemberTenant['payload'],
  tenantId: number,
  raw: string | null,
): Promise<number | null> {
  if (!raw) return null
  const id = Number(raw)
  if (!id) return null
  const found = await payload.find({
    collection: 'folders',
    where: tenantAndIdWhere(tenantId, id),
    depth: 0,
    limit: 1,
  })
  return found.docs[0] ? id : null
}

function recordsPath(tenantSlug: string) {
  return `/tenant/${tenantSlug}/records`
}

/** Create a new archive document from an inline form, then open its editor. */
export async function createDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !title) redirect(recordsPath(tenantSlug))

  const { payload, user, tenant } = ctx
  const folder = await tenantFolderId(payload, tenant.id, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    data: {
      tenant: tenant.id,
      title,
      // Placeholder so the required body is non-empty; the editor opens on it.
      body: `# ${title}\n\n`,
      origin: 'web-editor',
      createdBy: user.id,
      folder,
    },
  })
  redirect(`/tenant/${tenantSlug}/documents/${created.id}/edit`)
}

/** Create a subfolder under the current folder (or the archive root). */
export async function createFolderAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !name) redirect(recordsPath(tenantSlug))

  const { payload, tenant } = ctx
  const parent = await tenantFolderId(payload, tenant.id, String(formData.get('parentId') ?? ''))

  await payload.create({
    collection: 'folders',
    data: { tenant: tenant.id, name, parent },
  })
  revalidatePath(recordsPath(tenantSlug))
}

/** Move a document to another folder (or root). */
export async function moveDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const documentId = Number(formData.get('documentId'))
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !documentId) redirect(recordsPath(tenantSlug))

  const { payload, tenant } = ctx
  const folder = await tenantFolderId(payload, tenant.id, String(formData.get('folderId') ?? ''))

  const doc = await payload.find({
    collection: 'documents',
    where: tenantAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  if (doc.docs[0]) {
    await payload.update({ collection: 'documents', id: documentId, data: { folder } })
  }
  revalidatePath(`/tenant/${tenantSlug}/documents/${documentId}`)
  revalidatePath(recordsPath(tenantSlug))
}

/** Delete a document and return to the archive. */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const documentId = Number(formData.get('documentId'))
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !documentId) redirect(recordsPath(tenantSlug))

  const { payload, tenant } = ctx
  const doc = await payload.find({
    collection: 'documents',
    where: tenantAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  if (doc.docs[0]) {
    await payload.delete({ collection: 'documents', id: documentId })
  }
  redirect(recordsPath(tenantSlug))
}

export type FolderActionState = { ok: boolean; message?: string }

/**
 * Delete an empty folder. Refuses to delete a folder that still contains
 * subfolders or documents (reasonable guardrail, spec §6.3).
 */
export async function deleteFolderAction(
  _prev: FolderActionState | null,
  formData: FormData,
): Promise<FolderActionState> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const folderId = Number(formData.get('folderId'))
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !folderId) return { ok: false, message: 'Not authorized.' }

  const { payload, tenant } = ctx
  const folder = await payload.find({
    collection: 'folders',
    where: tenantAndIdWhere(tenant.id, folderId),
    depth: 0,
    limit: 1,
  })
  if (!folder.docs[0]) return { ok: false, message: 'Folder not found.' }

  const childFolders = await payload.count({
    collection: 'folders',
    where: { tenant: { equals: tenant.id }, parent: { equals: folderId } },
  })
  const childDocs = await payload.count({
    collection: 'documents',
    where: { tenant: { equals: tenant.id }, folder: { equals: folderId } },
  })
  if (childFolders.totalDocs > 0 || childDocs.totalDocs > 0) {
    return { ok: false, message: 'Move or delete its contents first.' }
  }

  await payload.delete({ collection: 'folders', id: folderId })
  revalidatePath(recordsPath(tenantSlug))
  return { ok: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'

import config from '@/payload.config'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { domainAndIdWhere } from '@/lib/tenant/scope'
import type { Domain, Tenant } from '@/payload-types'

type MemberTenant = {
  payload: Awaited<ReturnType<typeof getPayload>>
  user: { id: number }
  tenant: Domain | Tenant
  basePath: string
  legacyTenantId?: number
}

/** Resolve the active user and a tenant they are a member of, or null. */
async function getMemberTenant(tenantSlug: string): Promise<MemberTenant | null> {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) return null

  const domains = await payload.find({
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const domain = domains.docs[0]
  if (domain) {
    const ownerId = typeof domain.ownerUser === 'object' ? domain.ownerUser?.id : domain.ownerUser
    const domainAdmins = await payload.find({
      collection: 'domain-admins',
      where: { and: [{ domain: { equals: domain.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] },
      depth: 0,
      limit: 1,
    })
    const controlledCharacters = await payload.find({
      collection: 'characters',
      where: { and: [{ controlledBy: { equals: user.id } }, { status: { equals: 'active' } }] },
      depth: 0,
      limit: 200,
    })
    const characterIds = controlledCharacters.docs.map((character) => character.id)
    const member = characterIds.length
      ? await payload.find({
          collection: 'domain-memberships',
          where: { and: [{ domain: { equals: domain.id } }, { character: { in: characterIds } }, { status: { equals: 'active' } }] },
          depth: 0,
          limit: 1,
        })
      : { docs: [] }
    if (Number(ownerId) !== Number(user.id) && domainAdmins.docs.length === 0 && member.docs.length === 0) return null

    const legacy = await payload.find({ collection: 'tenants', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
    return {
      payload,
      user: { id: Number(user.id) },
      tenant: domain,
      basePath: `/domain/${domain.slug}`,
      legacyTenantId: legacy.docs[0]?.id,
    }
  }

  const tenants = await payload.find({ collection: 'tenants', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
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

  return { payload, user: { id: Number(user.id) }, tenant, basePath: `/tenant/${tenant.slug}`, legacyTenantId: tenant.id }
}

/** Verify a folder belongs to the tenant, returning its id or null. */
async function tenantFolderId(
  payload: MemberTenant['payload'],
  domainId: number,
  legacyTenantId: number | undefined,
  raw: string | null,
): Promise<number | null> {
  const id = raw ? Number(raw) : NaN
  if (!Number.isFinite(id) || id <= 0) {
    const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1 })
    return roots.docs[0]?.id ?? null
  }
  const found = await payload.find({
    collection: 'folders',
    where: { and: [{ or: [{ domain: { equals: domainId } }, ...(legacyTenantId ? [{ tenant: { equals: legacyTenantId } }] : [])] }, { id: { equals: id } }] },
    depth: 0,
    limit: 1,
  })
  return found.docs[0] ? id : null
}

function recordsPath(ctx: Pick<MemberTenant, 'basePath'>) {
  return `${ctx.basePath}/records`
}

/** Create a new archive document from an inline form, then open its editor. */
export async function createDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !title) redirect(`/domain/${tenantSlug}/records`)

  const { payload, user, tenant } = ctx
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    data: {
      domain: tenant.id,
      ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}),
      title,
      // Placeholder so the required body is non-empty; the editor opens on it.
      body: `# ${title}\n\n`,
      origin: 'web-editor',
      createdBy: user.id,
      folder,
    },
  })
  redirect(`${ctx.basePath}/documents/${created.id}/edit`)
}

/** Full-page customer document entry. The active Character is required for
 * authoring; user-level Domain administration alone cannot create a record. */
export async function createDocumentFromEditorAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const body = canonicalizeMarkdown(String(formData.get('body') ?? '')).trim() || `# ${title}`
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !title) redirect(`/domain/${tenantSlug}/records/new?error=missing`)

  const context = await getActiveContext()
  if (!context.activeCharacter || context.tenant?.slug !== tenantSlug) redirect(`/domain/${tenantSlug}/records/new?error=character`)
  const membership = await ctx.payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: ctx.tenant.id } }, { character: { equals: context.activeCharacter.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  if (!membership.docs[0]) redirect(`/domain/${tenantSlug}/records/new?error=character`)
  const folder = await tenantFolderId(ctx.payload, ctx.tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))
  const created = await ctx.payload.create({ collection: 'documents', data: { domain: ctx.tenant.id, ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}), title, body, origin: 'web-editor', createdBy: ctx.user.id, folder } })
  redirect(`${ctx.basePath}/documents/${created.id}/edit`)
}

/** Create a subfolder under the current folder (or the archive root). */
export async function createFolderAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !name) redirect(`/domain/${tenantSlug}/records`)

  const { payload, tenant } = ctx
  const parent = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('parentId') ?? ''))

  await payload.create({
    collection: 'folders',
    data: { domain: tenant.id, ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}), name, parent },
  })
  revalidatePath(recordsPath(ctx))
}

/** Move a document to another folder (or root). */
export async function moveDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const documentId = Number(formData.get('documentId'))
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !documentId) redirect(`/domain/${tenantSlug}/records`)

  const { payload, tenant } = ctx
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const doc = await payload.find({
    collection: 'documents',
    where: domainAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  if (doc.docs[0]) {
    await payload.update({ collection: 'documents', id: documentId, data: { folder } })
  }
  revalidatePath(`${ctx.basePath}/documents/${documentId}`)
  revalidatePath(recordsPath(ctx))
}

/** Delete a document and return to the archive. */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const documentId = Number(formData.get('documentId'))
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !documentId) redirect(`/domain/${tenantSlug}/records`)

  const { payload, tenant } = ctx
  const doc = await payload.find({
    collection: 'documents',
    where: domainAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  if (doc.docs[0]) {
    await payload.delete({ collection: 'documents', id: documentId })
  }
  redirect(recordsPath(ctx))
}

/** Import pasted (notecard) Markdown as a normal archive document. */
export async function importMarkdownAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  // Form serialization turns textareas into CRLF; store canonical LF.
  const body = canonicalizeMarkdown(String(formData.get('body') ?? '')).trim()
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !title || !body) redirect('/admin/login')

  const { payload, user, tenant } = ctx
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    data: {
      domain: tenant.id,
      ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}),
      title,
      body,
      origin: 'markdown-import',
      createdBy: user.id,
      folder,
    },
  })
  redirect(`${ctx.basePath}/documents/${created.id}`)
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
    where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: ctx.legacyTenantId ?? tenant.id } }] }, { id: { equals: folderId } }] },
    depth: 0,
    limit: 1,
  })
  if (!folder.docs[0]) return { ok: false, message: 'Folder not found.' }
  if (folder.docs[0].systemManaged) return { ok: false, message: 'The Domain root is system-managed and cannot be deleted.' }

  const childFolders = await payload.count({
    collection: 'folders',
    where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: ctx.legacyTenantId ?? tenant.id } }] }, { parent: { equals: folderId } }] },
  })
  const childDocs = await payload.count({
    collection: 'documents',
    where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: ctx.legacyTenantId ?? tenant.id } }] }, { folder: { equals: folderId } }] },
  })
  if (childFolders.totalDocs > 0 || childDocs.totalDocs > 0) {
    return { ok: false, message: 'Move or delete its contents first.' }
  }

  await payload.delete({ collection: 'folders', id: folderId })
  revalidatePath(recordsPath(ctx))
  return { ok: true }
}

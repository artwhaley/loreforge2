'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'

import config from '@/payload.config'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { resolveFilingPolicy, type FilingPolicy } from '@/lib/documents/lifecycle'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { attachDocumentCharacterLink, attachDocumentTag, findOrCreateDomainTag } from '@/lib/documents/links'
import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { moveDocument } from '@/lib/documents/move'
import { copyDocument } from '@/lib/documents/copy'
import { domainAndIdWhere } from '@/lib/tenant/scope'
import type { Domain, Tenant } from '@/payload-types'

type MemberTenant = {
  payload: Awaited<ReturnType<typeof getPayload>>
  user: { id: number }
  tenant: Domain | Tenant
  basePath: string
  legacyTenantId?: number
}

async function plainTextTypeId(payload: MemberTenant['payload'], domainId: number): Promise<number | null> {
  const result = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: 'Plain Text' } }, { active: { equals: true } }] }, depth: 0, limit: 1 })
  return result.docs[0]?.id ?? null
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
  const activeContext = await getActiveContext()
  if (!activeContext.activeCharacter || activeContext.tenant?.slug !== tenantSlug) redirect(`/domain/${tenantSlug}/records/new?error=character`)
  const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: activeContext.activeCharacter.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  if (!membership.docs[0]) redirect(`/domain/${tenantSlug}/records/new?error=character`)
  const documentType = await plainTextTypeId(payload, tenant.id)
  if (!documentType) redirect(`/domain/${tenantSlug}/records/new?error=type`)
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    context: { preparedByCharacterId: activeContext.activeCharacter.id, actorUserId: user.id },
    data: {
      domain: tenant.id,
      ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}),
      title,
      // Placeholder so the required body is non-empty; the editor opens on it.
      body: `# ${title}\n\n`,
      origin: 'web-editor',
      sourceKind: 'web',
      documentType,
      lifecycle: 'draft',
      publicAccess: 'inherit',
      createdBy: user.id,
      folder,
    },
  })
  await recordDocumentProvenance({ payload, domainId: tenant.id, documentId: created.id, eventType: 'created', actorUserId: user.id, revisionId: await latestDocumentRevisionId(payload, created.id) })
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
  const requestedTypeId = Number(formData.get('documentTypeId') ?? '')
  const typeResult = await ctx.payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: ctx.tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500 })
  const selectedType = typeResult.docs.find((item) => Number(item.id) === requestedTypeId) ?? typeResult.docs.find((item) => item.name.toLowerCase() === 'plain text')
  if (!selectedType) redirect(`/domain/${tenantSlug}/records/new?error=type`)
  const folderRecord = folder ? await ctx.payload.findByID({ collection: 'folders', id: folder, depth: 0 }).catch(() => null) : null
  const domainRecord = await ctx.payload.findByID({ collection: 'domains', id: ctx.tenant.id, depth: 0 })
  const policy = resolveFilingPolicy({ template: 'inherit', folder: (folderRecord?.filingPolicy ?? 'inherit') as FilingPolicy, documentType: selectedType.defaultFilingPolicy, domain: (domainRecord.defaultFilingPolicy ?? 'direct-file') as Exclude<FilingPolicy, 'inherit'> })
  const created = await ctx.payload.create({ collection: 'documents', context: { preparedByCharacterId: context.activeCharacter.id, actorUserId: ctx.user.id }, data: { domain: ctx.tenant.id, ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}), title, body, origin: 'web-editor', sourceKind: 'web', documentType: selectedType.id, lifecycle: policy === 'review-required' ? 'pending_review' : 'filed', publicAccess: 'inherit', createdBy: ctx.user.id, folder } })
  await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, eventType: 'created', actorUserId: ctx.user.id, actorCharacterId: context.activeCharacter.id, context: { lifecycle: created.lifecycle }, revisionId: await latestDocumentRevisionId(ctx.payload, created.id) })
  const interim = await authorizeInterimOperation(ctx.payload, { userId: ctx.user.id, activeCharacterId: context.activeCharacter.id }, ctx.tenant.id)
  if (interim === true) {
    const preparedByIds = formData.getAll('preparedByIds').map((value) => Number(value)).filter((id) => Number.isFinite(id) && id > 0)
    const concernIds = formData.getAll('concernCharacterIds').map((value) => Number(value)).filter((id) => Number.isFinite(id) && id > 0)
    for (const characterId of [...new Set(preparedByIds)]) if (characterId !== Number(context.activeCharacter.id)) await attachDocumentCharacterLink({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, characterId, kind: 'prepared_by', actor: { userId: ctx.user.id, characterId: context.activeCharacter.id } })
    const relationshipLabel = String(formData.get('concernsRelationship') ?? '').trim() || null
    for (const characterId of [...new Set(concernIds)]) await attachDocumentCharacterLink({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, characterId, kind: 'concerns', relationshipLabel, actor: { userId: ctx.user.id, characterId: context.activeCharacter.id } })
    const rawTags = String(formData.get('tagNames') ?? '').split(',').map((name) => name.trim()).filter(Boolean)
    for (const name of [...new Set(rawTags.map((tag) => tag.toLocaleLowerCase()))]) {
      const displayName = rawTags.find((tag) => tag.toLocaleLowerCase() === name) ?? name
      const tag = await findOrCreateDomainTag({ payload: ctx.payload, domainId: ctx.tenant.id, name: displayName, actor: { userId: ctx.user.id, characterId: context.activeCharacter.id } })
      await attachDocumentTag({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, tagId: tag.id, actor: { userId: ctx.user.id, characterId: context.activeCharacter.id } })
    }
  }
  if (created.lifecycle === 'filed') await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, eventType: 'filed', actorUserId: ctx.user.id, actorCharacterId: context.activeCharacter.id, context: { reason: 'filing-policy' }, revisionId: await latestDocumentRevisionId(ctx.payload, created.id) })
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
    draft: false,
    data: { domain: tenant.id, ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}), name, parent, filingPolicy: 'inherit' },
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
  const destinationDomainSlug = String(formData.get('destinationDomainSlug') ?? tenantSlug)
  const destinationResult = await payload.find({ collection: 'domains', where: { slug: { equals: destinationDomainSlug } }, depth: 0, limit: 1 })
  const destinationDomain = destinationResult.docs[0]
  if (!destinationDomain) redirect(`${ctx.basePath}/documents/${documentId}`)
  const folder = await tenantFolderId(payload, destinationDomain.id, destinationDomain.id === tenant.id ? ctx.legacyTenantId : undefined, String(formData.get('folderId') ?? ''))
  if (!folder) redirect(`${ctx.basePath}/documents/${documentId}`)
  try { await moveDocument({ payload, documentId, sourceDomainId: tenant.id, destinationDomainId: destinationDomain.id, destinationFolderId: folder, actorUserId: ctx.user.id, actorCharacterId: (await getActiveContext()).activeCharacter?.id, confirmCrossDomain: formData.get('confirmCrossDomain') === '1' }) } catch { /* customer redirect remains stable */ }
  revalidatePath(`/domain/${destinationDomain.slug}/documents/${documentId}`)
  revalidatePath(`${ctx.basePath}/documents/${documentId}`)
  revalidatePath(recordsPath(ctx))
}

/** Copy an independent Document through the same interim administrative seam. */
export async function copyDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const documentId = Number(formData.get('documentId'))
  const destinationDomainSlug = String(formData.get('destinationDomainSlug') ?? tenantSlug)
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !documentId) redirect(`/domain/${tenantSlug}/records`)
  const destination = await ctx.payload.find({ collection: 'domains', where: { slug: { equals: destinationDomainSlug } }, depth: 0, limit: 1 })
  if (!destination.docs[0]) redirect(`${ctx.basePath}/documents/${documentId}`)
  let copied: Awaited<ReturnType<typeof copyDocument>> | null = null
  try { copied = await copyDocument({ payload: ctx.payload, sourceDocumentId: documentId, destinationDomainId: destination.docs[0].id, destinationFolderId: String(formData.get('destinationFolderId') ?? '') || null, actorUserId: ctx.user.id, actorCharacterId: (await getActiveContext()).activeCharacter?.id, confirmCrossDomain: formData.get('confirmCrossDomain') === '1' }) } catch { /* customer redirect remains stable */ }
  if (copied) redirect(`/domain/${destination.docs[0].slug}/documents/${copied.id}`)
  redirect(`${ctx.basePath}/documents/${documentId}`)
}

/**
 * Legacy action name retained for old forms. It delegates to the reversible
 * workflow so no normal application path can permanently delete a Document.
 */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const { softDeleteDocumentAction } = await import('@/lib/actions/documentWorkflow')
  return softDeleteDocumentAction(formData)
}

/** Import pasted (notecard) Markdown as a normal archive document. */
export async function importMarkdownAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  // Form serialization turns textareas into CRLF; store canonical LF.
  const body = canonicalizeMarkdown(String(formData.get('body') ?? '')).trim()
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx || !title || !body) redirect(`/domain/${tenantSlug}/records?error=missing`)

  const { payload, user, tenant } = ctx
  const activeContext = await getActiveContext()
  if (!activeContext.activeCharacter || activeContext.tenant?.slug !== tenantSlug) redirect(`/domain/${tenantSlug}/records?error=character`)
  const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: activeContext.activeCharacter.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  if (!membership.docs[0]) redirect(`/domain/${tenantSlug}/records?error=character`)
  const documentType = await plainTextTypeId(payload, tenant.id)
  if (!documentType) redirect(`/domain/${tenantSlug}/records?error=type`)
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    context: { preparedByCharacterId: activeContext.activeCharacter.id, actorUserId: user.id },
    data: {
      domain: tenant.id,
      ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}),
      title,
      body,
      origin: 'markdown-import',
      sourceKind: 'markdown-import',
      documentType,
      lifecycle: 'draft',
      publicAccess: 'inherit',
      createdBy: user.id,
      folder,
    },
  })
  await recordDocumentProvenance({ payload, domainId: tenant.id, documentId: created.id, eventType: 'created', actorUserId: user.id, actorCharacterId: activeContext.activeCharacter.id, revisionId: await latestDocumentRevisionId(payload, created.id), context: { sourceKind: 'markdown-import' } })
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

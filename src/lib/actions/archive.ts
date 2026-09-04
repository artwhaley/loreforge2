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
import { addDocumentRelationship } from '@/lib/documents/relationships'
import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { domainAndIdWhere } from '@/lib/tenant/scope'
import type { Domain, Tenant } from '@/payload-types'

type MemberTenant = {
  payload: Awaited<ReturnType<typeof getPayload>>
  user: { id: number }
  tenant: Domain | Tenant
  basePath: string
  legacyTenantId?: number
}

export type DocumentEditorActionState = {
  error?: 'missing' | 'type' | 'authorization' | 'concerns'
  values?: {
    title: string
    body: string
    documentTypeId: string
    folderId: string
    concernLinks: string
    tagNames: string
  }
}

function editorValues(formData: FormData): DocumentEditorActionState['values'] {
  return {
    title: String(formData.get('title') ?? ''),
    body: String(formData.get('body') ?? ''),
    documentTypeId: String(formData.get('documentTypeId') ?? ''),
    folderId: String(formData.get('folderId') ?? ''),
    concernLinks: String(formData.get('concernLinks') ?? ''),
    tagNames: String(formData.get('tagNames') ?? ''),
  }
}

type ConcernSubmission = { characterId?: number; newName?: string; relationshipLabel?: string }

function parseConcernLinks(raw: string): ConcernSubmission[] | null {
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('invalid')
      const row = item as Record<string, unknown>
      const characterId = Number(row.characterId)
      const newName = typeof row.newName === 'string' ? row.newName.trim() : ''
      const relationshipLabel = typeof row.relationshipLabel === 'string' ? row.relationshipLabel.trim() : ''
      if ((!Number.isFinite(characterId) || characterId <= 0) && !newName) throw new Error('invalid')
      return { characterId: Number.isFinite(characterId) && characterId > 0 ? characterId : undefined, newName: newName || undefined, relationshipLabel: relationshipLabel || undefined }
    })
  } catch {
    return null
  }
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
  const activeCharacterId = activeContext.tenant?.slug === tenantSlug ? activeContext.activeCharacter?.id : undefined
  const documentType = await plainTextTypeId(payload, tenant.id)
  if (!documentType) redirect(`/domain/${tenantSlug}/records/new?error=type`)
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    context: activeCharacterId ? { preparedByCharacterId: activeCharacterId, actorUserId: user.id } : { allowUserCreate: true, actorUserId: user.id },
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
  await recordDocumentProvenance({ payload, domainId: tenant.id, documentId: created.id, eventType: 'created', actorUserId: user.id, actorCharacterId: activeCharacterId, revisionId: await latestDocumentRevisionId(payload, created.id) })
  redirect(`${ctx.basePath}/documents/${created.id}/edit`)
}

/** Full-page customer document entry. An acting Character is optional; when
 * selected it is automatically recorded as the required Prepared by credit. */
export async function createDocumentFromEditorAction(_previousState: DocumentEditorActionState, formData: FormData): Promise<DocumentEditorActionState> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const body = canonicalizeMarkdown(String(formData.get('body') ?? '')).trim() || `# ${title}`
  const values = editorValues(formData)!
  const ctx = await getMemberTenant(tenantSlug)
  if (!ctx) return { error: 'authorization', values }
  if (!title) return { error: 'missing', values }

  const context = await getActiveContext()
  const activeCharacterId = context.tenant?.slug === tenantSlug ? context.activeCharacter?.id : undefined
  const concernEntries = parseConcernLinks(values.concernLinks)
  if (!concernEntries) return { error: 'concerns', values }
  const folder = await tenantFolderId(ctx.payload, ctx.tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))
  const supersedesDocumentId = Number(formData.get('supersedesDocumentId') ?? '')
  if (Number.isFinite(supersedesDocumentId) && supersedesDocumentId > 0) {
    const previous = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.tenant.id, supersedesDocumentId), depth: 0, limit: 1 })
    if (!previous.docs[0]) return { error: 'authorization', values }
    const existingSuccessor = await ctx.payload.find({ collection: 'document-relationships', where: { and: [{ kind: { equals: 'supersedes' } }, { target: { equals: supersedesDocumentId } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (existingSuccessor.docs[0]) return { error: 'authorization', values }
  }
  const requestedTypeId = Number(formData.get('documentTypeId') ?? '')
  const typeResult = await ctx.payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: ctx.tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500 })
  const selectedType = typeResult.docs.find((item) => Number(item.id) === requestedTypeId) ?? typeResult.docs.find((item) => item.name.toLowerCase() === 'plain text')
  if (!selectedType) return { error: 'type', values }
  const interim = await authorizeInterimOperation(ctx.payload, { userId: ctx.user.id, activeCharacterId }, ctx.tenant.id)
  if (concernEntries.length > 0 && interim !== true) return { error: 'authorization', values }
  if (interim === true) {
    const requestedCharacterIds = [...new Set(concernEntries.flatMap((entry) => entry.characterId ? [entry.characterId] : []))]
    if (requestedCharacterIds.length > 0) {
      const characterRows = await ctx.payload.find({ collection: 'characters', where: { and: [{ id: { in: requestedCharacterIds } }, { status: { equals: 'active' } }] }, depth: 0, limit: requestedCharacterIds.length, overrideAccess: true })
      if (characterRows.docs.length !== requestedCharacterIds.length) return { error: 'concerns', values }
    }
  }
  const folderRecord = folder ? await ctx.payload.findByID({ collection: 'folders', id: folder, depth: 0 }).catch(() => null) : null
  const domainRecord = await ctx.payload.findByID({ collection: 'domains', id: ctx.tenant.id, depth: 0 })
  const policy = resolveFilingPolicy({ template: 'inherit', folder: (folderRecord?.filingPolicy ?? 'inherit') as FilingPolicy, documentType: selectedType.defaultFilingPolicy, domain: (domainRecord.defaultFilingPolicy ?? 'direct-file') as Exclude<FilingPolicy, 'inherit'> })
  const created = await ctx.payload.create({ collection: 'documents', context: activeCharacterId ? { preparedByCharacterId: activeCharacterId, actorUserId: ctx.user.id } : { allowUserCreate: true, actorUserId: ctx.user.id }, data: { domain: ctx.tenant.id, ...(ctx.legacyTenantId ? { tenant: ctx.legacyTenantId } : {}), title, body, origin: 'web-editor', sourceKind: 'web', documentType: selectedType.id, lifecycle: policy === 'review-required' ? 'pending_review' : 'filed', publicAccess: 'inherit', createdBy: ctx.user.id, folder } })
  if (Number.isFinite(supersedesDocumentId) && supersedesDocumentId > 0) {
    await addDocumentRelationship({ payload: ctx.payload, domainId: ctx.tenant.id, sourceId: created.id, targetId: supersedesDocumentId, kind: 'supersedes', actor: { userId: ctx.user.id, characterId: activeCharacterId } })
  }
  await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, eventType: 'created', actorUserId: ctx.user.id, actorCharacterId: activeCharacterId, context: { lifecycle: created.lifecycle }, revisionId: await latestDocumentRevisionId(ctx.payload, created.id) })
  if (interim === true) {
    for (const entry of concernEntries) {
      let characterId = entry.characterId
      if (!characterId && entry.newName) {
        const allCharacters = await ctx.payload.find({ collection: 'characters', where: { status: { equals: 'active' } }, depth: 0, limit: 5000, overrideAccess: true })
        const existing = allCharacters.docs.find((character) => character.name.trim().toLocaleLowerCase() === entry.newName?.toLocaleLowerCase())
        const character = existing ?? await ctx.payload.create({ collection: 'characters', overrideAccess: true, data: { name: entry.newName, status: 'active', createdBy: ctx.user.id } })
        characterId = Number(character.id)
      }
      if (characterId) await attachDocumentCharacterLink({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, characterId, kind: 'concerns', relationshipLabel: entry.relationshipLabel, actor: { userId: ctx.user.id, characterId: activeCharacterId } })
    }
    const rawTags = String(formData.get('tagNames') ?? '').split(',').map((name) => name.trim()).filter(Boolean)
    for (const name of [...new Set(rawTags.map((tag) => tag.toLocaleLowerCase()))]) {
      const displayName = rawTags.find((tag) => tag.toLocaleLowerCase() === name) ?? name
      const tag = await findOrCreateDomainTag({ payload: ctx.payload, domainId: ctx.tenant.id, name: displayName, actor: { userId: ctx.user.id, characterId: activeCharacterId } })
      await attachDocumentTag({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, tagId: tag.id, actor: { userId: ctx.user.id, characterId: activeCharacterId } })
    }
  }
  if (created.lifecycle === 'filed') await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.tenant.id, documentId: created.id, eventType: 'filed', actorUserId: ctx.user.id, actorCharacterId: activeCharacterId, context: { reason: 'filing-policy' }, revisionId: await latestDocumentRevisionId(ctx.payload, created.id) })
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
  const activeCharacterId = activeContext.tenant?.slug === tenantSlug ? activeContext.activeCharacter?.id : undefined
  const documentType = await plainTextTypeId(payload, tenant.id)
  if (!documentType) redirect(`/domain/${tenantSlug}/records?error=type`)
  const folder = await tenantFolderId(payload, tenant.id, ctx.legacyTenantId, String(formData.get('folderId') ?? ''))

  const created = await payload.create({
    collection: 'documents',
    context: activeCharacterId ? { preparedByCharacterId: activeCharacterId, actorUserId: user.id } : { allowUserCreate: true, actorUserId: user.id },
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
  await recordDocumentProvenance({ payload, domainId: tenant.id, documentId: created.id, eventType: 'created', actorUserId: user.id, actorCharacterId: activeCharacterId, revisionId: await latestDocumentRevisionId(payload, created.id), context: { sourceKind: 'markdown-import' } })
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

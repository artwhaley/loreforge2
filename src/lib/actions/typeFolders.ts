'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { isAllowed } from '@/lib/authz/evaluate'
import { getActiveContext } from '@/lib/tenant/activeTenant'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

type ActionContext = {
  payload: Awaited<ReturnType<typeof getPayload>>
  userId: number
  domain: { id: number; slug: string }
  actorCharacterId: number | null
}

async function resolveDomainAction(tenantSlug: string): Promise<ActionContext | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return null
  const active = await getActiveContext()
  const actorCharacterId = active.tenant?.slug === tenantSlug && active.activeCharacter ? Number(active.activeCharacter.id) : null
  return { payload, userId: Number(user.id), domain: { id: Number(domain.id), slug: domain.slug }, actorCharacterId }
}

async function requireTypeManagement(ctx: ActionContext): Promise<boolean> {
  return isAllowed({ payload: ctx.payload, actor: { userId: ctx.userId, activeCharacterId: ctx.actorCharacterId }, domainId: ctx.domain.id, capability: 'manage_types_tags', resource: { type: 'Domain', id: ctx.domain.id } })
}

export type TypeFolderActionResult = { ok: boolean; error?: string; typeFolderId?: number }

export async function createTypeFolderAction(input: {
  domainSlug: string
  name: string
  departmentId?: number | null
  parentId?: number | null
}): Promise<TypeFolderActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const name = String(input.name ?? '').trim()
  if (!ctx) return { ok: false, error: 'unauthorized' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  if (!name) return { ok: false, error: 'invalid' }
  try {
    const created = await ctx.payload.create({
      collection: 'type-folders',
      overrideAccess: true,
      data: {
        domain: ctx.domain.id,
        name,
        department: input.departmentId ? Number(input.departmentId) : null,
        parent: input.parentId ? Number(input.parentId) : null,
      },
    })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeFolderId: Number(created.id) }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

export async function renameTypeFolderAction(input: { domainSlug: string; typeFolderId: number | string; name: string }): Promise<TypeFolderActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeFolderId = Number(input.typeFolderId)
  const name = String(input.name ?? '').trim()
  if (!ctx || !Number.isInteger(typeFolderId) || typeFolderId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  if (!name) return { ok: false, error: 'invalid' }
  try {
    await ctx.payload.update({ collection: 'type-folders', id: typeFolderId, overrideAccess: true, data: { name } as never })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeFolderId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

export async function moveTypeFolderAction(input: {
  domainSlug: string
  typeFolderId: number | string
  departmentId?: number | null
  parentId?: number | null
}): Promise<TypeFolderActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeFolderId = Number(input.typeFolderId)
  if (!ctx || !Number.isInteger(typeFolderId) || typeFolderId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  try {
    await ctx.payload.update({ collection: 'type-folders', id: typeFolderId, overrideAccess: true, data: {
      ...(input.departmentId !== undefined ? { department: input.departmentId ? Number(input.departmentId) : null } : {}),
      ...(input.parentId !== undefined ? { parent: input.parentId ? Number(input.parentId) : null } : {}),
    } as never })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeFolderId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

/** Delete a type folder only when it is empty (no subfolders, no Types). */
export async function deleteTypeFolderAction(input: { domainSlug: string; typeFolderId: number | string }): Promise<TypeFolderActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeFolderId = Number(input.typeFolderId)
  if (!ctx || !Number.isInteger(typeFolderId) || typeFolderId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  try {
    const folder = await ctx.payload.findByID({ collection: 'type-folders', id: typeFolderId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!folder || relationId((folder as { domain?: unknown }).domain) !== Number(ctx.domain.id)) return { ok: false, error: 'not-found' }
    const children = await ctx.payload.count({ collection: 'type-folders', where: { parent: { equals: typeFolderId } }, overrideAccess: true })
    const types = await ctx.payload.count({ collection: 'document-types', where: { and: [{ domain: { equals: ctx.domain.id } }, { typeFolder: { equals: typeFolderId } }] }, overrideAccess: true })
    if (children.totalDocs > 0 || types.totalDocs > 0) return { ok: false, error: 'not-empty' }
    await ctx.payload.delete({ collection: 'type-folders', id: typeFolderId, overrideAccess: true })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeFolderId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}
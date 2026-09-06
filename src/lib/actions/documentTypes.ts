'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { isAllowed } from '@/lib/authz/evaluate'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { ensureLifecycleStageRows } from '@/lib/documents/lifecycleStages'

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

export type TypeTreeActionResult = { ok: boolean; error?: string; typeId?: number }

const TEMPLATE_SELECTIONS = ['blank', 'markdown', 'form'] as const
export type TemplateSelection = (typeof TEMPLATE_SELECTIONS)[number]

/** Derive the legacy allow* flags from the single stored selection (T02). */
function deriveAllowFlags(selection: TemplateSelection): { allowBlank: boolean; allowTemplate: boolean; allowForm: boolean } {
  return { allowBlank: selection === 'blank', allowTemplate: selection === 'markdown', allowForm: selection === 'form' }
}

/** Create a Document Type with the default stage configuration (T02 seeds). */
export async function createTypeAction(input: {
  domainSlug: string
  name: string
  description?: string
  active?: boolean
  departmentId?: number | null
  typeFolderId?: number | null
  templateSelection?: TemplateSelection
}): Promise<TypeTreeActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const name = String(input.name ?? '').trim()
  if (!ctx) return { ok: false, error: 'unauthorized' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  if (!name) return { ok: false, error: 'invalid' }
  const selection = (TEMPLATE_SELECTIONS as readonly string[]).includes(String(input.templateSelection ?? 'blank')) ? (input.templateSelection ?? 'blank') : 'blank'
  try {
    const created = await ctx.payload.create({
      collection: 'document-types',
      overrideAccess: true,
      data: {
        domain: ctx.domain.id,
        name,
        description: String(input.description ?? '').trim() || undefined,
        active: input.active !== false,
        templateSelection: selection,
        ...deriveAllowFlags(selection),
        department: input.departmentId ? Number(input.departmentId) : undefined,
        typeFolder: input.typeFolderId ? Number(input.typeFolderId) : undefined,
        defaultFilingPolicy: 'direct-file',
        templateFilingPolicy: 'inherit',
      },
    })
    await ensureLifecycleStageRows(ctx.payload, created.id)
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeId: Number(created.id) }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

export async function updateTypeAction(input: {
  domainSlug: string
  typeId: number | string
  name?: string
  description?: string | null
  active?: boolean
  departmentId?: number | null
  typeFolderId?: number | null
  templateSelection?: TemplateSelection
}): Promise<TypeTreeActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeId = Number(input.typeId)
  if (!ctx || !Number.isInteger(typeId) || typeId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  const current = await ctx.payload.findByID({ collection: 'document-types', id: typeId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!current || relationId((current as { domain?: unknown }).domain) !== Number(ctx.domain.id)) return { ok: false, error: 'not-found' }
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = String(input.name).trim()
    if (!name) return { ok: false, error: 'invalid' }
    data.name = name
  }
  if (input.description !== undefined) data.description = String(input.description).trim() || null
  if (input.active !== undefined) data.active = Boolean(input.active)
  if (input.departmentId !== undefined) data.department = input.departmentId ? Number(input.departmentId) : null
  if (input.typeFolderId !== undefined) data.typeFolder = input.typeFolderId ? Number(input.typeFolderId) : null
  if (input.templateSelection !== undefined) {
    const selection = (TEMPLATE_SELECTIONS as readonly string[]).includes(String(input.templateSelection)) ? input.templateSelection : null
    if (!selection) return { ok: false, error: 'invalid' }
    data.templateSelection = selection
    Object.assign(data, deriveAllowFlags(selection))
  }
  try {
    await ctx.payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: data as never })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

/** Move a Type between Department roots / manual type folders (drag & drop). */
export async function moveTypeAction(input: {
  domainSlug: string
  typeId: number | string
  departmentId?: number | null
  typeFolderId?: number | null
}): Promise<TypeTreeActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeId = Number(input.typeId)
  if (!ctx || !Number.isInteger(typeId) || typeId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  try {
    await ctx.payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: {
      ...(input.departmentId !== undefined ? { department: input.departmentId ? Number(input.departmentId) : null } : {}),
      ...(input.typeFolderId !== undefined ? { typeFolder: input.typeFolderId ? Number(input.typeFolderId) : null } : {}),
    } as never })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

export async function setActiveTypeAction(input: { domainSlug: string; typeId: number | string; active: boolean }): Promise<TypeTreeActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeId = Number(input.typeId)
  if (!ctx || !Number.isInteger(typeId) || typeId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  try {
    await ctx.payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: { active: Boolean(input.active) } as never })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}

/** Delete a Type only when it has no Documents (else suggest deactivating). */
export async function deleteTypeAction(input: { domainSlug: string; typeId: number | string }): Promise<TypeTreeActionResult> {
  const ctx = await resolveDomainAction(input.domainSlug)
  const typeId = Number(input.typeId)
  if (!ctx || !Number.isInteger(typeId) || typeId <= 0) return { ok: false, error: 'invalid' }
  if (!await requireTypeManagement(ctx)) return { ok: false, error: 'unauthorized' }
  try {
    const used = await ctx.payload.count({ collection: 'documents', where: { and: [{ domain: { equals: ctx.domain.id } }, { documentType: { equals: typeId } }] } })
    if (used.totalDocs > 0) return { ok: false, error: 'has-documents' }
    await ctx.payload.delete({ collection: 'document-types', id: typeId, overrideAccess: true })
    await ctx.payload.delete({ collection: 'lifecycle-stages', where: { documentType: { equals: typeId } }, overrideAccess: true })
    revalidatePath(`/domain/${ctx.domain.slug}/document-types`)
    return { ok: true, typeId }
  } catch (error) {
    ctx.payload.logger.error(error)
    return { ok: false, error: 'failed' }
  }
}
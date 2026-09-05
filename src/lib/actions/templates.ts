'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { assertFormSchema, type LoreForgeFormSchema } from '@/lib/forms/schema'
import { autoBodyTemplate, autoTitleTemplate } from '@/lib/forms/layout'
import { isAllowed } from '@/lib/authz/evaluate'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { isTemplateAvailableAt } from '@/lib/templates/resolve'
import { initialRouteFolder } from '@/lib/documents/creation'

export type TemplateActionState = { error?: string; ok?: boolean }

type ManagerPayload = Awaited<ReturnType<typeof getPayload>>

async function managerContext(domainSlug: string) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { payload, user: null, domain: null, error: 'Sign in to manage Templates.' }
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1, overrideAccess: true })
  const domain = domains.docs[0]
  if (!domain) return { payload, user, domain: null, error: 'Domain not found.' }
  const active = await getActiveContext()
  const authority = await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: active.tenant?.slug === domainSlug ? active.activeCharacter?.id ?? null : null }, domainId: domain.id, capability: 'manage_templates', resource: { type: 'Domain', id: domain.id } })
  if (!authority) return { payload, user, domain, error: 'You cannot manage Templates in this Domain.' }
  return { payload, user, domain, error: null }
}

function parseJson(value: FormDataEntryValue | null): unknown {
  try { return JSON.parse(String(value ?? '')) } catch { return null }
}

/**
 * Auto-layout seam (P06R): the question list is the source of truth. The
 * record title/body templates are derived here — never typed by the author —
 * so the Studio stays free of Markdown and {{token}} editing entirely.
 */
function deriveOutputTemplates(schema: LoreForgeFormSchema, name: string, recordNameKey: string | null) {
  const titleTemplate = autoTitleTemplate(schema.fields, recordNameKey) ?? name
  return { titleTemplate, bodyTemplate: autoBodyTemplate(schema.fields) }
}

function readFormPlacement(formData: FormData) {
  const scopeFolder = Number(formData.get('scopeFolderId') ?? '')
  // P07X-T06: destinationFolder is retained in the storage model only for
  // migration compatibility. Customer Forms never choose it; assertPlacement
  // derives it from the selected Document Type's lifecycle routing.
  const destinationFolder = 0
  const documentType = Number(formData.get('documentTypeId') ?? '')
  const baseTemplateId = Number(formData.get('baseTemplateId') ?? '')
  return { scopeFolder, destinationFolder, documentType, baseTemplateId }
}

/** Shared create/update checks: same-Domain folders/types/base availability. */
async function assertPlacement(ctx: { payload: ManagerPayload; domain: { id: number } }, placement: { scopeFolder: number; destinationFolder: number; documentType: number; baseTemplateId: number }) {
  const { scopeFolder, documentType, baseTemplateId } = placement
  if (!scopeFolder || !documentType) throw new Error('Document Type and availability Folder are required.')
  const [typeResult, scopeResult, baseResult] = await Promise.all([
    ctx.payload.find({ collection: 'document-types', where: { and: [{ id: { equals: documentType } }, { domain: { equals: ctx.domain.id } }, { active: { equals: true } }] }, depth: 0, limit: 1, overrideAccess: true }),
    ctx.payload.find({ collection: 'folders', where: { and: [{ id: { equals: scopeFolder } }, { domain: { equals: ctx.domain.id } }] }, depth: 0, limit: 1, overrideAccess: true }),
    baseTemplateId ? ctx.payload.find({ collection: 'templates', where: { and: [{ id: { equals: baseTemplateId } }, { domain: { equals: ctx.domain.id } }, { active: { equals: true } }] }, depth: 0, limit: 1, overrideAccess: true }) : { docs: [] },
  ])
  if (!typeResult.docs[0]) throw new Error('Choose an active Document Type from this Domain.')
  const scope = scopeResult.docs[0]
  if (!scope) throw new Error('Choose an availability Folder from this Domain.')
  const type = typeResult.docs[0]
  const routedId = initialRouteFolder(type, 'draft', null)
  const destinationResult = routedId
    ? await ctx.payload.find({ collection: 'folders', where: { and: [{ id: { equals: routedId } }, { domain: { equals: ctx.domain.id } }] }, depth: 0, limit: 1, overrideAccess: true })
    : await ctx.payload.find({ collection: 'folders', where: { and: [{ domain: { equals: ctx.domain.id } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1, overrideAccess: true })
  const destination = destinationResult.docs[0]
  if (!destination) throw new Error('The selected Document Type has no lifecycle route or Domain root Folder.')
  const base = baseResult.docs[0]
  if (baseTemplateId && !base) throw new Error('The base Template is not available.')
  if (base && !isTemplateAvailableAt(base as never, scope as never, (await ctx.payload.find({ collection: 'folders', where: { domain: { equals: ctx.domain.id } }, depth: 0, limit: 10000, overrideAccess: true })).docs as never)) throw new Error('The base Template is not available at the selected Folder.')
  return { scopeFolder, destinationFolder: Number(destination.id), documentType, baseTemplateId }
}

function revalidateForms(domainSlug: string) {
  revalidatePath(`/domain/${domainSlug}/forms`)
  revalidatePath(`/domain/${domainSlug}/templates`)
}

/** Form Studio create seam: only the neutral schema is accepted. */
export async function createFormTemplateAction(_previous: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  const domainSlug = String(formData.get('domainSlug') ?? '')
  const ctx = await managerContext(domainSlug)
  if (ctx.error || !ctx.domain || !ctx.user) return { error: ctx.error ?? 'Not authorized.' }
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Give the form a name.' }
  const recordNameKey = String(formData.get('recordNameFieldKey') ?? '').trim() || null
  let schema: ReturnType<typeof assertFormSchema>
  try { schema = assertFormSchema(parseJson(formData.get('formSchema'))) } catch (error) { return { error: error instanceof Error ? error.message : 'The form fields are invalid.' } }
  if (schema.fields.length === 0) return { error: 'Add at least one question to the form.' }
  try {
    const placement = await assertPlacement(ctx, readFormPlacement(formData))
    const { titleTemplate, bodyTemplate } = deriveOutputTemplates(schema, name, recordNameKey)
    await ctx.payload.create({
      collection: 'templates',
      overrideAccess: true,
      data: {
        domain: ctx.domain.id,
        documentType: placement.documentType,
        name,
        kind: 'form',
        scopeFolder: placement.scopeFolder,
        destinationFolder: placement.destinationFolder,
        ...(placement.baseTemplateId ? { baseTemplate: placement.baseTemplateId } : {}),
        allowDestinationOverride: false,
        availableToDescendants: true,
        titleTemplate,
        bodyTemplate,
        formSchema: schema,
        lifecyclePolicy: String(formData.get('lifecyclePolicy') ?? 'inherit'),
        active: true,
        version: 1,
      } as never,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The form could not be saved.' }
  }
  revalidateForms(domainSlug)
  redirect(`/domain/${domainSlug}/forms`)
}

/**
 * Form Studio edit seam: save changes to an existing form as the next
 * version. Editing a deactivated copy (from Duplicate) also re-activates it,
 * fixing the old duplicate-then-nowhere flow.
 */
export async function updateFormTemplateAction(_previous: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  const domainSlug = String(formData.get('domainSlug') ?? '')
  const templateId = Number(formData.get('templateId') ?? '')
  const ctx = await managerContext(domainSlug)
  if (ctx.error || !ctx.domain || !ctx.user) return { error: ctx.error ?? 'Not authorized.' }
  const found = await ctx.payload.find({ collection: 'templates', where: { and: [{ id: { equals: templateId } }, { domain: { equals: ctx.domain.id } }, { kind: { equals: 'form' } }] }, depth: 1, limit: 1, overrideAccess: true })
  const existing = found.docs[0]
  if (!existing) return { error: 'Form not found.' }
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Give the form a name.' }
  const recordNameKey = String(formData.get('recordNameFieldKey') ?? '').trim() || null
  let schema: ReturnType<typeof assertFormSchema>
  try { schema = assertFormSchema(parseJson(formData.get('formSchema'))) } catch (error) { return { error: error instanceof Error ? error.message : 'The form fields are invalid.' } }
  if (schema.fields.length === 0) return { error: 'Add at least one question to the form.' }
  try {
    const placement = await assertPlacement(ctx, readFormPlacement(formData))
    const { titleTemplate, bodyTemplate } = deriveOutputTemplates(schema, name, recordNameKey)
    await ctx.payload.update({
      collection: 'templates',
      id: templateId,
      overrideAccess: true,
      data: {
        name,
        documentType: placement.documentType,
        scopeFolder: placement.scopeFolder,
        destinationFolder: placement.destinationFolder,
        ...(placement.baseTemplateId ? { baseTemplate: placement.baseTemplateId } : { baseTemplate: null }),
        titleTemplate,
        bodyTemplate,
        formSchema: schema,
        active: true,
        version: Number(existing.version ?? 1) + 1,
      } as never,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The form could not be saved.' }
  }
  revalidateForms(domainSlug)
  redirect(`/domain/${domainSlug}/forms`)
}

export async function deactivateTemplateAction(formData: FormData): Promise<void> {
  const domainSlug = String(formData.get('domainSlug') ?? '')
  const templateId = Number(formData.get('templateId') ?? '')
  const ctx = await managerContext(domainSlug)
  if (ctx.error || !ctx.domain || !templateId) return
  const found = await ctx.payload.find({ collection: 'templates', where: { and: [{ id: { equals: templateId } }, { domain: { equals: ctx.domain.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (found.docs[0]) await ctx.payload.update({ collection: 'templates', id: templateId, overrideAccess: true, data: { active: false } as never })
  revalidatePath(`/domain/${domainSlug}/forms`)
  revalidatePath(`/domain/${domainSlug}/templates`)
}

export async function duplicateTemplateAction(formData: FormData): Promise<void> {
  const domainSlug = String(formData.get('domainSlug') ?? '')
  const templateId = Number(formData.get('templateId') ?? '')
  const ctx = await managerContext(domainSlug)
  if (ctx.error || !ctx.domain || !templateId) return
  const found = await ctx.payload.find({ collection: 'templates', where: { and: [{ id: { equals: templateId } }, { domain: { equals: ctx.domain.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  const original = found.docs[0]
  if (!original) return
  await ctx.payload.create({ collection: 'templates', overrideAccess: true, data: { ...original, id: undefined, name: `${original.name} copy`, active: false, version: Number(original.version ?? 1) + 1 } as never })
  revalidatePath(`/domain/${domainSlug}/forms`)
  revalidatePath(`/domain/${domainSlug}/templates`)
}

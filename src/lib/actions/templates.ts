'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { assertFormSchema } from '@/lib/forms/schema'
import { isAllowed } from '@/lib/authz/evaluate'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { isTemplateAvailableAt } from '@/lib/templates/resolve'

export type TemplateActionState = { error?: string; ok?: boolean }

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

/** Form Studio save seam: only the neutral schema is accepted. */
export async function createFormTemplateAction(_previous: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  const domainSlug = String(formData.get('domainSlug') ?? '')
  const ctx = await managerContext(domainSlug)
  if (ctx.error || !ctx.domain || !ctx.user) return { error: ctx.error ?? 'Not authorized.' }
  const name = String(formData.get('name') ?? '').trim()
  const titleTemplate = String(formData.get('titleTemplate') ?? '').trim()
  const bodyTemplate = String(formData.get('bodyTemplate') ?? '')
  const scopeFolder = Number(formData.get('scopeFolderId') ?? '')
  const destinationFolder = Number(formData.get('destinationFolderId') ?? '')
  const documentType = Number(formData.get('documentTypeId') ?? '')
  const baseTemplateId = Number(formData.get('baseTemplateId') ?? '')
  if (!name || !titleTemplate || !bodyTemplate.trim() || !scopeFolder || !destinationFolder || !documentType) return { error: 'Name, output, Document Type, availability Folder, and destination Folder are required.' }
  let schema: ReturnType<typeof assertFormSchema>
  try { schema = assertFormSchema(parseJson(formData.get('formSchema'))) } catch (error) { return { error: error instanceof Error ? error.message : 'The form fields are invalid.' } }
  try {
    if (baseTemplateId) {
      const [baseResult, folderResult] = await Promise.all([
        ctx.payload.find({ collection: 'templates', where: { and: [{ id: { equals: baseTemplateId } }, { domain: { equals: ctx.domain.id } }, { active: { equals: true } }] }, depth: 0, limit: 1, overrideAccess: true }),
        ctx.payload.find({ collection: 'folders', where: { domain: { equals: ctx.domain.id } }, depth: 0, limit: 10000, overrideAccess: true }),
      ])
      const base = baseResult.docs[0]
      const scope = folderResult.docs.find((folder) => Number(folder.id) === scopeFolder)
      if (!base || !scope || !isTemplateAvailableAt(base as never, scope as never, folderResult.docs as never)) return { error: 'Base Template is not available at the selected Folder.' }
    }
    await ctx.payload.create({
      collection: 'templates',
      overrideAccess: true,
      data: {
        domain: ctx.domain.id,
        documentType,
        name,
        kind: 'form',
        scopeFolder,
        destinationFolder,
        ...(baseTemplateId ? { baseTemplate: baseTemplateId } : {}),
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
  revalidatePath(`/domain/${domainSlug}/forms`)
  revalidatePath(`/domain/${domainSlug}/templates`)
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

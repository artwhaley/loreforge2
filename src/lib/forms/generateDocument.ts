import type { Payload } from 'payload'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { composeTemplate, renderTemplateTokens } from '@/lib/templates/compose'
import type { LoreForgeFormSchema } from './schema'

/**
 * The Ticket 07 design seam: form template + submitted answers -> archive
 * Document. One small, explicit application module, deliberately NOT embedded
 * in Form Builder plugin callbacks or UI, so the authoring tool can change
 * later without touching generation (ticket guardrail).
 */

/** The archive metadata the app adds to every Form (see payload.config.ts). */
export type FormArchiveMetadata = {
  id: number | string
  title: string
  folder?: number | null
  archive: {
    titleTemplate: string
    markdownTemplate: string
  }
}

export type FormAnswers = Record<string, string | boolean | null | undefined>

/** How a submitted value renders into Markdown: booleans as true/false. */
function renderValue(value: string | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Replace {{field_name}} placeholders with submitted answers.
 * Unknown/empty answers render as empty text — no invented defaults.
 */
export function renderTemplate(template: string, answers: FormAnswers): string {
  return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_match, name: string) =>
    renderValue(answers[name]),
  )
}

export type NeutralTemplateMetadata = {
  id: number | string
  name: string
  kind: 'document' | 'form'
  titleTemplate: string
  bodyTemplate: string
  formSchema?: LoreForgeFormSchema | null
  baseTemplate?: NeutralTemplateMetadata | number | string | null
  destinationFolder?: number | string | null
  documentType?: number | string | null
  lifecyclePolicy?: 'inherit' | 'direct-file' | 'review-required'
}

/** Strict neutral-schema rendering used by all Phase 6 creation paths. */
export function renderNeutralTemplate(template: NeutralTemplateMetadata, answers: FormAnswers) {
  const lookup = (id: number | string): NeutralTemplateMetadata | null => {
    if (template.baseTemplate && typeof template.baseTemplate === 'object' && String(template.baseTemplate.id) === String(id)) return template.baseTemplate
    return null
  }
  const composed = composeTemplate(template, lookup)
  const schema = template.kind === 'form' ? template.formSchema : undefined
  return {
    title: renderTemplateTokens(composed.titleTemplate, answers, schema).trim(),
    body: canonicalizeMarkdown(renderTemplateTokens(composed.bodyTemplate, answers, schema)).trim(),
    chain: composed.chain,
  }
}

export type GeneratedDocument = {
  id: number
  title: string
  body: string
}

/**
 * Generate (create) a normal archive Document from a form template and
 * submitted answers. Verifies the destination folder belongs to the tenant.
 * Returns the created document; callers own redirect/UX.
 */
export async function generateDocumentFromSubmission(args: {
  payload: Payload
  tenant: { id: number; slug: string }
  user: { id: number }
  actorCharacterId?: number
  form: FormArchiveMetadata | NeutralTemplateMetadata
  answers: FormAnswers
}): Promise<GeneratedDocument> {
  const { payload, tenant, user, actorCharacterId, form, answers } = args

  const neutral = 'bodyTemplate' in form
  const rendered = neutral
    ? renderNeutralTemplate(form, answers)
    : { title: renderTemplate((form as FormArchiveMetadata).archive.titleTemplate, answers).trim(), body: canonicalizeMarkdown(renderTemplate((form as FormArchiveMetadata).archive.markdownTemplate, answers)).trim(), chain: [] }
  const title = rendered.title
  const body = rendered.body

  // Confirm the destination folder belongs to this tenant before filing.
  let folder: number | null = null
  const configuredFolder = neutral ? form.destinationFolder : form.folder
  if (configuredFolder) {
    const found = await payload.find({
      collection: 'folders',
      where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { id: { equals: configuredFolder } }] },
      depth: 0,
      limit: 1,
    })
    if (found.docs[0]) folder = Number(configuredFolder)
  }
  if (folder === null) {
    const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: tenant.id } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1 })
    folder = roots.docs[0]?.id ?? null
  }

  const documentType = neutral && form.documentType
    ? Number(form.documentType)
    : (await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { name: { equals: 'Plain Text' } }, { active: { equals: true } }] }, depth: 0, limit: 1 })).docs[0]?.id
  if (!documentType) throw new Error('The Domain has no active Plain Text Document Type.')

  const created = await payload.create({
    collection: 'documents',
    context: actorCharacterId == null ? { allowUserCreate: true, actorUserId: user.id } : { preparedByCharacterId: actorCharacterId, actorUserId: user.id },
    data: {
      domain: tenant.id,
      tenant: tenant.id,
      folder,
      title,
      body,
      origin: 'form',
      sourceKind: 'form',
      documentType,
      lifecycle: 'draft',
      publicAccess: 'inherit',
      createdBy: user.id,
    },
    depth: 0,
  })

  await recordDocumentProvenance({
    payload,
    domainId: tenant.id,
    documentId: created.id,
    eventType: 'created',
    actorUserId: user.id,
    actorCharacterId,
    context: { sourceKind: 'form' },
    revisionId: await latestDocumentRevisionId(payload, created.id),
  })

  return { id: Number(created.id), title, body }
}

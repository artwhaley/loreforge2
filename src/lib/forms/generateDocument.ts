import type { Payload } from 'payload'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { initialRouteFolder } from '@/lib/documents/creation'
import { composeTemplate, renderTemplateTokens } from '@/lib/templates/compose'
import { displayAnswersForRender, type DisplayAnswers } from './layout'
import { runInTransaction } from '@/lib/documents/relationships'
import { attachDocumentCharacterLink, ensurePreparedBy } from '@/lib/documents/links'
import type { FormAnswers, LoreForgeFormSchema } from './schema'

const CHARACTER_TYPES = new Set(['character', 'characters'])

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

/** How a submitted value renders into Markdown: booleans as true/false. */
function renderValue(value: string | boolean | string[] | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(', ')
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
  /** Fixed, author-supplied Markdown framing a generated Form record. */
  headerMarkdown?: string | null
  footerMarkdown?: string | null
}

/** Join fixed Form layout sections around generated answers canonically. */
export function composeFormSections(headerMarkdown: string | null | undefined, bodyMarkdown: string, footerMarkdown: string | null | undefined): string {
  return canonicalizeMarkdown([headerMarkdown, bodyMarkdown, footerMarkdown]
    .map((section) => String(section ?? '').trim())
    .filter(Boolean)
    .join('\n\n')).trim()
}

/** Strict neutral-schema rendering used by all Phase 6 creation paths. */
export function renderNeutralTemplate(template: NeutralTemplateMetadata, answers: FormAnswers) {
  const lookup = (id: number | string): NeutralTemplateMetadata | null => {
    if (template.baseTemplate && typeof template.baseTemplate === 'object' && String(template.baseTemplate.id) === String(id)) return template.baseTemplate
    return null
  }
  const composed = composeTemplate(template, lookup)
  const schema = template.kind === 'form' ? template.formSchema : undefined
  const body = canonicalizeMarkdown(renderTemplateTokens(composed.bodyTemplate, answers, schema)).trim()
  return {
    // Titles are plain text (never Markdown), so values are not escaped there:
    // a date must read 2026-09-04, not 2026\-09\-04.
    title: renderTemplateTokens(composed.titleTemplate, answers, schema, { escapeMarkdown: false }).trim(),
    body: template.kind === 'form' ? composeFormSections(template.headerMarkdown, body, template.footerMarkdown) : body,
    chain: composed.chain,
  }
}

/**
 * Answers as a generated record should *read* them: select answers become
 * their display labels, checkbox strings normalize to booleans (Yes/No), and
 * Character answers become the Character's name (a multiple pick joins its
 * names with commas). Raw values (ids, option values) are untouched for the
 * archive/index side-effects that consume them. Inactive or missing
 * Characters keep their raw id here; the link step below rejects them with
 * the authoritative error before anything is created.
 */
export async function answersForRecordRender(args: {
  payload: Payload
  schema: LoreForgeFormSchema
  answers: FormAnswers
}): Promise<DisplayAnswers> {
  const display = displayAnswersForRender(args.schema, args.answers)
  for (const field of args.schema.fields) {
    if (!CHARACTER_TYPES.has(field.type)) continue
    const raw = args.answers[field.key]
    if (field.type === 'characters') {
      const rawIds = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [String(raw)]
      if (rawIds.length === 0) {
        display[field.key] = ''
        continue
      }
      const names: string[] = []
      for (const rawId of rawIds) {
        const characterId = Number(rawId)
        const character = Number.isFinite(characterId) && characterId > 0
          ? await args.payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true }).catch(() => null)
          : null
        if (character && character.status === 'active') names.push(character.name)
        else names.push(String(rawId))
      }
      display[field.key] = names.join(', ')
      continue
    }
    if (raw === undefined || raw === null || raw === '') continue
    const characterId = Number(raw)
    if (!Number.isFinite(characterId) || characterId <= 0) continue
    const character = await args.payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true }).catch(() => null)
    if (character && character.status === 'active') display[field.key] = character.name
    else display[field.key] = String(raw)
  }
  return display
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
  const schema: LoreForgeFormSchema = neutral ? (form.formSchema ? form.formSchema : { version: 1, fields: [] }) : { version: 1, fields: [] }
  let rendered: { title: string; body: string; chain: Array<number | string> }
  if (neutral) {
    const renderAnswers = schema.fields.some((field) => CHARACTER_TYPES.has(field.type))
      ? await answersForRecordRender({ payload, schema, answers })
      : displayAnswersForRender(schema, answers)
    rendered = renderNeutralTemplate(form, renderAnswers)
  } else {
    const legacy = form as FormArchiveMetadata
    rendered = { title: renderTemplate(legacy.archive.titleTemplate, answers).trim(), body: canonicalizeMarkdown(renderTemplate(legacy.archive.markdownTemplate, answers)).trim(), chain: [] }
  }
  const title = rendered.title
  const body = rendered.body

  const documentType = neutral && form.documentType
    ? Number(form.documentType)
    : (await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { name: { equals: 'Plain Text' } }, { active: { equals: true } }] }, depth: 0, limit: 1 })).docs[0]?.id
  if (!documentType) throw new Error('The Domain has no active Plain Text Document Type.')
  const typeRecord = await payload.findByID({ collection: 'document-types', id: documentType, depth: 0, overrideAccess: true }).catch(() => null) as unknown as { domain?: unknown; active?: unknown; allowForm?: unknown; defaultFolder?: unknown; draftFolder?: unknown; pendingReviewFolder?: unknown; filedFolder?: unknown; lockedFolder?: unknown } | null
  if (!typeRecord || typeRecord.active === false) throw new Error('The selected Document Type is not active.')
  if (neutral && typeRecord.allowForm !== true) throw new Error('The selected Document Type does not allow Form creation.')
  const typeDomain = typeof typeRecord.domain === 'object' && typeRecord.domain !== null && 'id' in typeRecord.domain ? Number((typeRecord.domain as { id: number | string }).id) : Number(typeRecord.domain)
  if (!Number.isFinite(typeDomain) || typeDomain !== Number(tenant.id)) throw new Error('The selected Document Type must belong to this Domain.')
  const lifecyclePolicy = neutral ? (form as NeutralTemplateMetadata).lifecyclePolicy : undefined
  const lifecycle = lifecyclePolicy === 'review-required' ? 'pending_review' : 'filed'
  // Neutral Form creation is Type-first: legacy Template destinationFolder is
  // deliberately ignored, and the Type owns the initial lifecycle route.
  let folder: number | null = neutral ? initialRouteFolder(typeRecord, lifecycle, null) : null
  if (!neutral) {
    const configuredFolder = form.folder
    if (configuredFolder) {
      const found = await payload.find({
        collection: 'folders',
        where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { id: { equals: configuredFolder } }] },
        depth: 0,
        limit: 1,
      })
      if (found.docs[0]) folder = Number(configuredFolder)
    }
  }
  if (folder === null) {
    const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: tenant.id } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1 })
    folder = roots.docs[0]?.id ?? null
  }
  if (!neutral) {
    // The legacy `tenant` column belongs to the retired tenants collection and
    // is only ever written when a real legacy tenant id exists (see archive.ts).
    // A Domain id must NOT be written there — tenants has no such row and the
    // FK insert fails. Modern documents are scoped by `domain` alone.
    const created = await payload.create({ collection: 'documents', context: actorCharacterId == null ? { allowUserCreate: true, actorUserId: user.id } : { preparedByCharacterId: actorCharacterId, actorUserId: user.id }, data: { domain: tenant.id, folder, title, body, origin: 'form', sourceKind: 'form', documentType, lifecycle: 'draft', publicAccess: 'inherit', createdBy: user.id }, depth: 0 })
    return { id: Number(created.id), title, body }
  }
  const created = await runInTransaction(payload, async (transactionID) => {
    const req = { transactionID }
    // `domain` scopes the record; the legacy tenants collection has no row for
    // this Domain, so `tenant` is never written here (FOREIGN KEY fix).
    const row = await payload.create({ collection: 'documents', req, context: actorCharacterId == null ? { allowUserCreate: true, actorUserId: user.id } : { preparedByCharacterId: actorCharacterId, actorUserId: user.id }, data: { domain: tenant.id, folder, title, body, origin: 'form', sourceKind: 'form', documentType, lifecycle, publicAccess: 'inherit', createdBy: user.id }, depth: 0 })
    if (actorCharacterId != null) await ensurePreparedBy({ payload, domainId: tenant.id, documentId: row.id, characterId: actorCharacterId, actor: { userId: user.id, characterId: actorCharacterId }, transactionID })
    // Character questions become real Character links on the record. A single
    // pick links one Character; a multiple pick links every chosen one.
    // Authorization note: submitReportFormAction preflights create_document on
    // the destination folder before this transaction, and the Document row is
    // created by this same actor inside this same transaction. Attaching the
    // form's own Character links is part of that single create act — the
    // per-document edit_document check is skipped here exactly as
    // ensurePreparedBy skips it and as archive.ts skips it for tags on the
    // same create ("the post-create Document edit check applies to later
    // mutations"). It stays enforced on every later mutation surface
    // (document editor, /api/document-links).
    for (const field of schema.fields) {
      if (!CHARACTER_TYPES.has(field.type)) continue
      const raw = answers[field.key]
      const rawIds = field.type === 'characters'
        ? Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [String(raw)]
        : raw === undefined || raw === null || raw === '' ? [] : [String(raw)]
      for (const rawId of rawIds) {
        const characterId = Number(rawId)
        if (!Number.isFinite(characterId) || characterId <= 0) throw new Error(`Character field ${field.key} must identify an existing Character.`)
        const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true, req })
        if (!character || character.status !== 'active') throw new Error(`Character field ${field.key} references an inactive Character.`)
        await attachDocumentCharacterLink({ payload, domainId: tenant.id, documentId: row.id, characterId, kind: 'concerns', relationshipLabel: field.relationshipLabel, actor: { userId: user.id, characterId: actorCharacterId }, skipAuthorization: true, transactionID })
      }
    }
    await recordDocumentProvenance({ payload, domainId: tenant.id, documentId: row.id, eventType: 'created', actorUserId: user.id, actorCharacterId, context: { sourceKind: 'form', templateId: Number(form.id), lifecycle }, revisionId: await latestDocumentRevisionId(payload, row.id, transactionID), transactionID })
    return row
  })
  return { id: Number(created.id), title, body }
}

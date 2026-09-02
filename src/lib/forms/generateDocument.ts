import type { Payload } from 'payload'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'

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
  form: FormArchiveMetadata
  answers: FormAnswers
}): Promise<GeneratedDocument> {
  const { payload, tenant, user, form, answers } = args

  const title = renderTemplate(form.archive.titleTemplate, answers).trim()
  const body = canonicalizeMarkdown(
    renderTemplate(form.archive.markdownTemplate, answers),
  ).trim()

  // Confirm the destination folder belongs to this tenant before filing.
  let folder: number | null = null
  if (form.folder) {
    const found = await payload.find({
      collection: 'folders',
      where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { id: { equals: form.folder } }] },
      depth: 0,
      limit: 1,
    })
    if (found.docs[0]) folder = Number(form.folder)
  }
  if (folder === null) {
    const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: tenant.id } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1 })
    folder = roots.docs[0]?.id ?? null
  }

  const created = await payload.create({
    collection: 'documents',
    data: {
      domain: tenant.id,
      tenant: tenant.id,
      folder,
      title,
      body,
      origin: 'form',
      createdBy: user.id,
    },
    depth: 0,
  })

  return { id: Number(created.id), title, body }
}

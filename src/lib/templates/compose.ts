import { assertFormSchema, type FormAnswers, type LoreForgeFormSchema } from '@/lib/forms/schema'

export type TemplateForComposition = {
  id: number | string
  kind?: 'document' | 'form'
  titleTemplate: string
  bodyTemplate: string
  formSchema?: unknown
  baseTemplate?: TemplateForComposition | number | string | null
}

export type ComposedTemplate = { titleTemplate: string; bodyTemplate: string; chain: Array<number | string> }

const tokenPattern = /\{\{\s*([\w-]+)\s*\}\}/g

function baseId(value: TemplateForComposition['baseTemplate']): number | string | null {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? value.id : value
}

/** Compose a child with its already-loaded base chain; never append implicitly. */
export function composeTemplate(template: TemplateForComposition, lookup: (id: number | string) => TemplateForComposition | null): ComposedTemplate {
  const chain: Array<number | string> = []
  const visit = (current: TemplateForComposition): { titleTemplate: string; bodyTemplate: string } => {
    const id = current.id
    if (chain.some((item) => String(item) === String(id))) throw new Error('Template base graph contains a cycle.')
    chain.push(id)
    const base = baseId(current.baseTemplate)
    if (!base) return { titleTemplate: current.titleTemplate, bodyTemplate: current.bodyTemplate }
    const referenced = typeof current.baseTemplate === 'object' ? current.baseTemplate : lookup(base)
    if (!referenced) throw new Error('The base Template could not be loaded.')
    const baseOutput = visit(referenced)
    const matches = [...baseOutput.bodyTemplate.matchAll(/\{\{\s*content\s*\}\}/g)]
    if (matches.length !== 1) throw new Error('Every referenced base Template must contain exactly one {{content}} insertion point.')
    return {
      titleTemplate: current.titleTemplate,
      bodyTemplate: baseOutput.bodyTemplate.replace(/\{\{\s*content\s*\}\}/, current.bodyTemplate),
    }
  }
  return { ...visit(template), chain }
}

/** Markdown-safe value escaping used by form generation. */
export function escapeMarkdownValue(value: string | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value).replace(/[\\`*_{}\[\]()#+.!|>~-]/g, '\\$&')
}

/**
 * Render {{token}} placeholders with submitted answers. `escapeMarkdown` is
 * on for body Markdown (so filer text cannot restructure the document) and
 * off for plain record titles (a date must read 2026-09-04, not
 * 2026\-09\-04). Token/answer validation is identical either way.
 */
export function renderTemplateTokens(template: string, answers: FormAnswers, schema?: LoreForgeFormSchema | unknown, options?: { escapeMarkdown?: boolean }): string {
  const validated = schema === undefined ? undefined : assertFormSchema(schema)
  const allowed = validated ? new Set(validated.fields.map((field) => field.key)) : null
  const escape = options?.escapeMarkdown !== false
  return template.replace(tokenPattern, (match, key: string) => {
    if (key === 'content') return match
    if (allowed && !allowed.has(key)) throw new Error(`Unknown template token {{${key}}}.`)
    if (!(key in answers)) throw new Error(`Missing answer for template token {{${key}}}.`)
    return escape ? escapeMarkdownValue(answers[key]) : renderPlainValue(answers[key])
  })
}

/** Plain-text value rendering (no Markdown escaping) for record titles. */
export function renderPlainValue(value: string | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}


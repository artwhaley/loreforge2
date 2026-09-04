/**
 * P06R auto-layout: how a question list becomes the record a filer creates.
 *
 * The Form Studio never asks an author to type Markdown or `{{token}}`
 * placeholders. Instead the question list is the source of truth and these
 * pure helpers derive (a) stable field keys, (b) the record title template,
 * and (c) the record body template. The collection still stores ordinary
 * title/body templates (Templates.beforeChange and renderNeutralTemplate are
 * untouched), the Studio just never shows them.
 */

import type { FormAnswers, LoreForgeFormField, LoreForgeFormSchema } from './schema'

const TOKEN_PATTERN = /\{\{\s*([\w-]+)\s*\}\}/g

/** Question types that can name a record when answered. */
const TITLE_CANDIDATE_TYPES = new Set(['text', 'textarea', 'date', 'select'])

/**
 * Lowercase snake-case machine key derived from a human label. Empty when the
 * label has no usable characters (callers must fall back to 'field').
 * Keys must match schema KEY_PATTERN: starts with a lowercase letter.
 */
export function slugifyLabel(label: string): string {
  const slug = String(label)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!slug) return ''
  return /^[a-z]/.test(slug) ? slug : `f_${slug}`
}

/** A deterministic unique key given the keys already in use. */
export function uniqueKey(base: string, taken: ReadonlySet<string>): string {
  const candidate = base || 'field'
  if (!taken.has(candidate)) return candidate
  let index = 2
  while (taken.has(`${candidate}_${index}`)) index += 1
  return `${candidate}_${index}`
}

/**
 * Deterministic unique select-option values from human option labels. Values
 * have no key pattern, but stay clean snake-case so records read naturally.
 */
export function slugifyOptionValue(label: string): string {
  return slugifyLabel(label) || 'option'
}

/** Keys of the questions a filer could name a record with, in order. */
export function recordNameCandidates(fields: readonly LoreForgeFormField[]): LoreForgeFormField[] {
  return fields.filter((field) => TITLE_CANDIDATE_TYPES.has(field.type))
}

/**
 * When loading an existing form into the Studio, infer which question (if
 * any) names its records from the stored title template: a single token that
 * belongs to a naming-capable question, else null (the form name is used).
 */
export function recordNameKeyFromTitle(titleTemplate: string, fields: readonly LoreForgeFormField[]): string | null {
  const candidates = new Set(recordNameCandidates(fields).map((field) => field.key))
  const tokens = [...String(titleTemplate).matchAll(TOKEN_PATTERN)].map((match) => match[1])
  if (tokens.length === 1 && candidates.has(tokens[0])) return tokens[0]
  return null
}

/**
 * The title template for an auto-layout record: the answer to the chosen
 * source question, or the first naming-capable question when no source is
 * pinned. Returns null when no question can name the record (e.g. only
 * checkboxes/Character picks), in which case the caller uses the form name.
 */
export function autoTitleTemplate(
  fields: readonly LoreForgeFormField[],
  pinnedSourceKey: string | null | undefined,
): string | null {
  const candidates = recordNameCandidates(fields)
  if (candidates.length === 0) return null
  const key = pinnedSourceKey && candidates.some((field) => field.key === pinnedSourceKey)
    ? pinnedSourceKey
    : candidates[0].key
  return `{{${key}}}`
}

/**
 * Heading text is literal template text, so braces that could be misread as
 * tokens are neutralized and newlines collapsed. Everything else (Markdown
 * emphasis, etc.) is left alone — matching how the rest of the product treats
 * authored template text.
 */
export function headingText(label: string): string {
  return label
    .replace(/\{\{/g, '{')
    .replace(/\}\}/g, '}')
    .replace(/[ \t]*\r?\n[ \t]*/g, ' ')
    .trim()
}

/**
 * The record body for a question list: one section per question. Never emits
 * `{{content}}` — that token is reserved for base-template composition.
 */
export function autoBodyTemplate(fields: readonly LoreForgeFormField[]): string {
  if (fields.length === 0) return ''
  return fields
    .map((field) => `## ${headingText(field.label)}\n\n{{${field.key}}}`)
    .join('\n\n')
}

/** True when the composed title/body reference only declared fields. */
export function tokensMatchFields(titleTemplate: string, bodyTemplate: string, fields: readonly LoreForgeFormField[]): boolean {
  const declared = new Set<string>(fields.map((field) => field.key))
  for (const match of `${titleTemplate}\n${bodyTemplate}`.matchAll(TOKEN_PATTERN)) {
    const name = match[1]
    if (name === 'content') return false
    if (!declared.has(name)) return false
  }
  return true
}

export type DisplayAnswers = Record<string, string | boolean>

/**
 * Answers as they should *read* in a generated record. Select answers are
 * stored as option values but must display as their labels; checkbox strings
 * ('true'/''/boolean) are normalized to real booleans so records read
 * Yes/No. Character answers stay raw ids here — resolving them to names needs
 * the payload and happens in the action layer before rendering.
 */
export function displayAnswersForRender(schema: LoreForgeFormSchema, answers: FormAnswers): DisplayAnswers {
  const out: DisplayAnswers = {}
  for (const field of schema.fields) {
    const raw = answers[field.key]
    if (field.type === 'select') {
      const value = typeof raw === 'string' ? raw.trim() : ''
      const option = value ? field.options?.find((item) => item.value === value) : undefined
      out[field.key] = option ? option.label : raw === undefined || raw === null ? '' : String(raw)
      continue
    }
    if (field.type === 'checkbox') {
      if (typeof raw === 'boolean') out[field.key] = raw
      else out[field.key] = raw === 'true' || raw === 'yes'
      continue
    }
    out[field.key] = raw === undefined || raw === null ? '' : raw
  }
  return out
}

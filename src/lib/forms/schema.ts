/**
 * LoreForge's neutral form schema.  This is deliberately independent of the
 * Payload Form Builder shape so the customer authoring experience and the
 * archive generator do not inherit CMS-specific concepts.
 */

export const FORM_SCHEMA_VERSION = 1 as const
/** The Character question family: a single pick vs. a multiple pick. */
export const CHARACTER_FIELD_TYPES = ['character', 'characters'] as const
export const FORM_FIELD_TYPES = ['text', 'textarea', 'date', 'time', 'select', 'checkbox', 'character', 'characters'] as const
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

/**
 * Presentation emphasis for a question on the member-facing form. Kept as
 * optional presentation hints (never data semantics) so older stored schemas
 * without them stay valid: 'short' and 'medium' cap the input width, 'full'
 * (the default when absent) spans the whole row.
 */
export const FORM_FIELD_WIDTHS = ['short', 'medium', 'full'] as const
export type FormFieldWidth = (typeof FORM_FIELD_WIDTHS)[number]

export type FormOption = { label: string; value: string }

export type LoreForgeFormField = {
  key: string
  type: FormFieldType
  label: string
  help?: string
  required?: boolean
  options?: FormOption[]
  default?: string | boolean
  /** Height of a long-answer field in lines (3-24). Absent = renderer default. */
  rows?: number
  /** Visual width emphasis; absent = 'full'. */
  width?: FormFieldWidth
  relationshipLabel?: string
}

export type LoreForgeFormSchema = {
  version: typeof FORM_SCHEMA_VERSION
  fields: LoreForgeFormField[]
}

/**
 * One submitted answer. A multiple-Character question holds an array of
 * Character ids; every other question type holds a scalar (checkbox answers
 * are real booleans after normalization).
 */
export type FormAnswerValue = string | boolean | string[] | null | undefined
export type FormAnswers = Record<string, FormAnswerValue>

export type FormSchemaIssue = { path: string; message: string }

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

function issue(path: string, message: string): FormSchemaIssue {
  return { path, message }
}

/** Return all schema errors instead of silently coercing authored data. */
export function validateFormSchema(input: unknown): { valid: true; value: LoreForgeFormSchema } | { valid: false; issues: FormSchemaIssue[] } {
  if (!input || typeof input !== 'object') return { valid: false, issues: [issue('formSchema', 'A form schema is required.')] }
  const record = input as Record<string, unknown>
  if (record.version !== FORM_SCHEMA_VERSION) return { valid: false, issues: [issue('version', `Only form schema version ${FORM_SCHEMA_VERSION} is supported.`)] }
  if (!Array.isArray(record.fields)) return { valid: false, issues: [issue('fields', 'Fields must be an array.')] }
  const issues: FormSchemaIssue[] = []
  const seen = new Set<string>()
  const fields: LoreForgeFormField[] = []

  record.fields.forEach((raw, index) => {
    const path = `fields[${index}]`
    if (!raw || typeof raw !== 'object') {
      issues.push(issue(path, 'Field must be an object.'))
      return
    }
    const item = raw as Record<string, unknown>
    const key = String(item.key ?? '').trim()
    const label = String(item.label ?? '').trim()
    const type = String(item.type ?? '') as FormFieldType
    if (!KEY_PATTERN.test(key)) issues.push(issue(`${path}.key`, 'Use a stable lowercase key with letters, numbers, and underscores; it must start with a letter.'))
    if (seen.has(key)) issues.push(issue(`${path}.key`, `Duplicate field key "${key}".`))
    if (key) seen.add(key)
    if (!label) issues.push(issue(`${path}.label`, 'A display label is required.'))
    if (!(FORM_FIELD_TYPES as readonly string[]).includes(type)) issues.push(issue(`${path}.type`, `Unsupported field type "${type}".`))
    const required = Boolean(item.required)
    const optionsRaw = item.options
    let options: FormOption[] | undefined
    if (type === 'select') {
      if (!Array.isArray(optionsRaw) || optionsRaw.length === 0) {
        issues.push(issue(`${path}.options`, 'Select fields require at least one option.'))
      } else {
        const optionKeys = new Set<string>()
        options = []
        optionsRaw.forEach((option, optionIndex) => {
          if (!option || typeof option !== 'object') {
            issues.push(issue(`${path}.options[${optionIndex}]`, 'Option must be an object.'))
            return
          }
          const optionRecord = option as Record<string, unknown>
          const optionLabel = String(optionRecord.label ?? '').trim()
          const optionValue = String(optionRecord.value ?? '').trim()
          if (!optionLabel || !optionValue) issues.push(issue(`${path}.options[${optionIndex}]`, 'Options require a label and value.'))
          if (optionKeys.has(optionValue)) issues.push(issue(`${path}.options[${optionIndex}].value`, `Duplicate option value "${optionValue}".`))
          if (optionValue) optionKeys.add(optionValue)
          options?.push({ label: optionLabel, value: optionValue })
        })
      }
    } else if (optionsRaw !== undefined) {
      issues.push(issue(`${path}.options`, 'Options are only valid for select fields.'))
    }
    const defaultValue = item.default
    if (defaultValue !== undefined && typeof defaultValue !== 'string' && typeof defaultValue !== 'boolean') issues.push(issue(`${path}.default`, 'Defaults must be text or boolean values.'))
    const relationshipLabel = item.relationshipLabel === undefined ? undefined : String(item.relationshipLabel).trim()
    if (!(CHARACTER_FIELD_TYPES as readonly string[]).includes(type) && relationshipLabel) issues.push(issue(`${path}.relationshipLabel`, 'Relationship labels are only valid for Character fields.'))
    // Presentation hints (P06R): optional and additive, never structural. Any
    // older stored schema without them remains valid and renders at defaults.
    let width: FormFieldWidth | undefined
    const widthRaw = item.width
    if (widthRaw !== undefined) {
      if ((FORM_FIELD_WIDTHS as readonly string[]).includes(String(widthRaw))) width = widthRaw as FormFieldWidth
      else issues.push(issue(`${path}.width`, `Unsupported field width "${String(widthRaw)}".`))
    }
    let rows: number | undefined
    const rowsRaw = item.rows
    if (rowsRaw !== undefined) {
      if (typeof rowsRaw !== 'number' || !Number.isInteger(rowsRaw) || rowsRaw < 3 || rowsRaw > 24) issues.push(issue(`${path}.rows`, 'Long-answer height must be a whole number of lines between 3 and 24.'))
      else rows = rowsRaw
    }
    fields.push({
      key,
      type,
      label,
      help: item.help === undefined ? undefined : String(item.help),
      required,
      ...(options ? { options } : {}),
      ...(defaultValue !== undefined ? { default: defaultValue as string | boolean } : {}),
      ...(width ? { width } : {}),
      ...(rows !== undefined ? { rows } : {}),
      ...(relationshipLabel ? { relationshipLabel } : {}),
    })
  })
  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: { version: FORM_SCHEMA_VERSION, fields } }
}

export function assertFormSchema(input: unknown): LoreForgeFormSchema {
  const result = validateFormSchema(input)
  if (!result.valid) throw new Error(result.issues.map((item) => `${item.path}: ${item.message}`).join(' '))
  return result.value
}

export function emptyFormSchema(): LoreForgeFormSchema {
  return { version: FORM_SCHEMA_VERSION, fields: [] }
}

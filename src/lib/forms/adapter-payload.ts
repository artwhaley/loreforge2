import { assertFormSchema, type FormFieldType, type FormOption, type LoreForgeFormSchema } from './schema'

type LegacyField = {
  blockType?: string
  name?: string
  label?: string
  required?: boolean
  admin?: { description?: string }
  options?: Array<{ label?: string; value?: string }>
}

export type LegacyFormAdapterResult = {
  schema: LoreForgeFormSchema
  warnings: string[]
}

const SUPPORTED = new Set<string>(['text', 'textarea', 'date', 'select', 'checkbox'])

/**
 * Convert the proven subset of the Payload Form Builder shape.  Unsupported
 * blocks are reported explicitly and omitted; callers must show the warning
 * before activating the imported Template rather than guessing at semantics.
 */
export function adaptPayloadFormFields(fields: unknown): LegacyFormAdapterResult {
  const warnings: string[] = []
  const converted: Array<Record<string, unknown>> = []
  if (!Array.isArray(fields)) return { schema: { version: 1, fields: [] }, warnings: ['Legacy form has no field array.'] }

  for (const [index, raw] of fields.entries()) {
    const field = (raw ?? {}) as LegacyField
    const blockType = String(field.blockType ?? '')
    const key = String(field.name ?? '').trim()
    if (!SUPPORTED.has(blockType)) {
      warnings.push(`Field ${index + 1} (${key || 'unnamed'}) uses unsupported Payload field type "${blockType || 'unknown'}".`)
      continue
    }
    const value: Record<string, unknown> = {
      key,
      type: blockType as FormFieldType,
      label: String(field.label ?? key),
      required: Boolean(field.required),
    }
    if (field.admin?.description) value.help = field.admin.description
    if (blockType === 'select') {
      value.options = (field.options ?? []).map((option): FormOption => ({ label: String(option.label ?? ''), value: String(option.value ?? '') }))
    }
    converted.push(value)
  }

  try {
    return { schema: assertFormSchema({ version: 1, fields: converted }), warnings }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Legacy form schema validation failed.')
    return { schema: { version: 1, fields: [] }, warnings }
  }
}

export function adaptPayloadForm(form: { fields?: unknown }): LegacyFormAdapterResult {
  return adaptPayloadFormFields(form.fields)
}


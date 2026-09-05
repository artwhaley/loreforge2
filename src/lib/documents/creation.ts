import type { Lifecycle } from './lifecycle'
import { resolveLifecycleRouteFolder } from './typeRouting'

/** The three customer-facing ways to create a Document. */
export type CreationMethod = 'blank' | 'template' | 'form'

export type CreationTypeShape = {
  id?: number | string
  allowBlank?: unknown
  allowTemplate?: unknown
  allowForm?: unknown
}

export type CreationTemplateShape = {
  id?: number | string
  kind?: unknown
  active?: unknown
  documentType?: unknown
}

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

const isTrue = (value: unknown, fallback = false): boolean => value === undefined || value === null ? fallback : value === true

/**
 * Return the methods a Type can actually offer right now. Blank is a direct
 * Type setting. Template/Form require both the corresponding setting and at
 * least one active child Template attached to this exact Type.
 */
export function effectiveCreationMethods(type: CreationTypeShape | null | undefined, templates: readonly CreationTemplateShape[] = []): CreationMethod[] {
  if (!type) return []
  const methods: CreationMethod[] = []
  // Missing allowBlank is the compatibility default for pre-P07X rows.
  if (isTrue(type.allowBlank, true)) methods.push('blank')
  const typeId = relationId(type.id)
  const hasChild = (kind: CreationTemplateShape['kind']) => templates.some((template) => {
    if (template.active === false || template.kind !== kind) return false
    const childTypeId = relationId(template.documentType)
    return typeId === null || childTypeId === typeId
  })
  if (isTrue(type.allowTemplate) && hasChild('document')) methods.push('template')
  if (isTrue(type.allowForm) && hasChild('form')) methods.push('form')
  return methods
}

/** Whether the Type explicitly enables the requested method. */
export function typeAllowsCreationMethod(type: CreationTypeShape | null | undefined, method: CreationMethod): boolean {
  if (!type) return false
  if (method === 'blank') return isTrue(type.allowBlank, true)
  if (method === 'template') return isTrue(type.allowTemplate)
  return isTrue(type.allowForm)
}

/** Validate a method against the effective child set and return a useful error. */
export function assertEffectiveCreationMethod(type: CreationTypeShape | null | undefined, method: CreationMethod, templates: readonly CreationTemplateShape[] = []): void {
  if (!effectiveCreationMethods(type, templates).includes(method)) {
    throw new Error(`The selected Document Type does not offer the ${method} creation method.`)
  }
}

/**
 * Resolve the first Folder for a Type-owned creation. New records normally
 * begin as Draft; callers may pass another lifecycle for generated records.
 * The lifecycle route wins, then defaultFolder, then the caller's legacy
 * current Folder. This is deliberately a small wrapper around the one routing
 * helper so creation and transitions cannot drift apart.
 */
export function initialRouteFolder(
  type: { defaultFolder?: unknown; draftFolder?: unknown; pendingReviewFolder?: unknown; filedFolder?: unknown; lockedFolder?: unknown } | null | undefined,
  lifecycle: Lifecycle = 'draft',
  legacyCurrentFolderId: number | null = null,
): number | null {
  return resolveLifecycleRouteFolder(type, lifecycle, legacyCurrentFolderId)
}

export { relationId as creationRelationId }

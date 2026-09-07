import type { Payload } from 'payload'

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

export type PreparedDocumentCreation = {
  typeId: number
  method: CreationMethod
  lifecycle: Lifecycle
  folderId: number
  typeRow: Record<string, unknown>
  /** P08X-T06: whether the draft stage allows the private-draft choice at creation. */
  privateDraftsAllowed: boolean
}

type PrepareArgs = {
  payload: Payload
  actor: { userId: number | string; activeCharacterId?: number | string | null }
  domainId: number | string
  documentTypeId: number | string
  method: CreationMethod
  templateId?: number | string | null
  /** Desired initial lifecycle; callers that already resolved policy pass it. Defaults to draft. */
  lifecycle?: Lifecycle
}

/**
 * P08-GATE-02 canonical creation plan: one Type-first authorization primitive
 * used by every customer creation path (editor + form submission).
 *
 * 1. load/validate active Type in this Domain
 * 2. validate method against allowBlank/allowTemplate/allowForm (+ child kind)
 * 3. validate Template/Form belongs to that Type
 * 4. load one AuthzSession; require create_document on the Type
 * 5. resolve initial Folder solely through Type lifecycle routing/root fallback
 * 6. apply Folder/Subdomain/Domain deny narrowing on the resolved Folder
 * 7. return trusted plan. No caller-supplied Folder ever participates.
 */
export async function prepareDocumentCreation(args: PrepareArgs): Promise<PreparedDocumentCreation> {
  const { payload, actor, domainId, documentTypeId, method, templateId, lifecycle } = args
  const domain = Number(domainId)
  const typeId = Number(documentTypeId)
  if (!Number.isInteger(domain) || !Number.isInteger(typeId) || typeId <= 0) throw new Error('type')
  if (!['blank', 'template', 'form'].includes(method)) throw new Error('method')
  const typeRow = await payload.findByID({ collection: 'document-types', id: typeId, depth: 0, overrideAccess: true }).catch(() => null) as unknown as Record<string, unknown> | null
  const typeDomain = typeRow ? relationId((typeRow as { domain?: unknown }).domain) : null
  if (!typeRow || typeDomain !== domain || (typeRow as { active?: unknown }).active === false) throw new Error('type')
  // Method allow-flag (child-kind validation happens against the template row below).
  if (method === 'blank') {
    if (!isTrue((typeRow as { allowBlank?: unknown }).allowBlank, true)) throw new Error('method')
  } else if (method === 'template') {
    if (!isTrue((typeRow as { allowTemplate?: unknown }).allowTemplate)) throw new Error('method')
  } else {
    if (!isTrue((typeRow as { allowForm?: unknown }).allowForm)) throw new Error('method')
  }
  if (method !== 'blank') {
    const tid = templateId == null ? NaN : Number(templateId)
    if (!Number.isInteger(tid) || tid <= 0) throw new Error('template')
    const template = await payload.findByID({ collection: 'templates', id: tid, depth: 0, overrideAccess: true }).catch(() => null) as unknown as Record<string, unknown> | null
    const templateTypeId = template ? relationId((template as { documentType?: unknown }).documentType) : null
    const templateKind = template ? String((template as { kind?: unknown }).kind ?? 'document') : ''
    const templateActive = template ? (template as { active?: unknown }).active !== false : false
    const expectedKind = method === 'form' ? 'form' : 'document'
    if (!template || !templateActive || templateTypeId !== typeId || templateKind !== expectedKind) throw new Error('template-type')
  }
  const { loadAuthorizationSession, decideOne, folderNarrowingDeny } = await import('@/lib/authz/session')
  const session = await loadAuthorizationSession(payload, actor, domain)
  const decision = decideOne(session, 'create_document', { type: 'DocumentType', id: typeId })
  if (!decision.allowed) throw new Error('authorization')
  const initialLifecycle: Lifecycle = lifecycle ?? 'draft'
  let folderId = resolveLifecycleRouteFolder(typeRow, initialLifecycle, null)
  if (folderId == null) {
    const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domain } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1, overrideAccess: true })
    folderId = roots.docs[0] ? Number((roots.docs[0] as { id: number | string }).id) : null
  }
  if (folderId == null) throw new Error('folder')
  if (folderNarrowingDeny(session, 'create_document', folderId)) throw new Error('folder-narrowed')
  // P08X-T06: the private-draft choice is only offered when the Draft stage's
  // privateDraftsAllowed is on; other initial stages never create private
  // records. T07 builds the create-screen dropdown on top of this flag.
  const privateDraftsAllowed = initialLifecycle === 'draft'
    ? (session.stageLists.get(typeId)?.get('draft')?.privateDraftsAllowed ?? true)
    : false
  return { typeId, method, lifecycle: initialLifecycle, folderId, typeRow, privateDraftsAllowed }
}

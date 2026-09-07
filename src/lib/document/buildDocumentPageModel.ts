import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { DocumentPageModel } from '@/lib/page-models/document'
import { getDocumentForTenant } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'
import { canSupersedeDocument, type Lifecycle } from '@/lib/documents/lifecycle'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { decideInSession, resolveDocumentTarget, stageManageGrant, type DocumentTargetExtra } from '@/lib/authz/session'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'
import { DOCUMENT_MUTATION_ERROR_MESSAGES } from '@/lib/documents/errorCodes'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

const formatDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return 'unknown date'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Document reading model assembly (Stage I). Moved, not rewritten, from the
 * document route: the same authorization decision, supersession resolution,
 * credits/tags aggregation, and capability booleans — now an explicit
 * semantic model that every Design reads compositionally.
 *
 * Returns `null` when the document is absent or unreadable (the route renders
 * `notFound()` in that case, exactly as today).
 */
export async function buildDocumentPageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'> | null
  activeCharacter: Character | null
  documentId: string
  source?: string
  errorCode?: string
}): Promise<DocumentPageModel | null> {
  const { tenant, user, activeCharacter, documentId, source, errorCode } = input
  const baseUrl = `/domain/${tenant.slug}`
  const doc = await getDocumentForTenant(tenant, documentId)
  if (!doc) return null

  const payload = await (await import('@/lib/payload')).getLorePayload()
  const session = user ? await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id) : null
  // P08X-T06/T07: the document decision target carries the Type id, the
  // deciding stage (current lifecycle), and the private-draft visibility
  // boundary so stage-list grants and the creator-only gate apply here —
  // exactly as they do in the evaluator and the records list.
  const docRow = doc as unknown as { subdomain?: unknown; documentType?: unknown; privateDraft?: unknown; creatorCharacter?: unknown }
  const docTarget = session ? resolveDocumentTarget(session, { id: Number(doc.id), folderId: relationId(doc.folder), subdomainId: relationId(docRow.subdomain), documentTypeId: relationId(docRow.documentType), stage: (doc.lifecycle ?? null) as Lifecycle | null, privateDraft: docRow.privateDraft === true, creatorCharacterId: relationId(docRow.creatorCharacter) }) : null
  if (!session || !docTarget || !decideInSession(session, 'read', docTarget).allowed) return null
  const canEdit = canEditDocumentBody(doc.lifecycle, Boolean((doc as unknown as { locked?: unknown }).locked)) && decideInSession(session, 'edit_document', docTarget).allowed
  // P08-GATE-01: affordances come from the decision engine, never role === 'admin'.
  const canSubmit = decideInSession(session, 'submit_document', { ...docTarget, stage: 'submitted' as Lifecycle }).allowed
  const canFile = decideInSession(session, 'file_document', { ...docTarget, stage: 'filed' as Lifecycle }).allowed
  const canApprove = decideInSession(session, 'approve_document', { ...docTarget, stage: 'filed' as Lifecycle }).allowed
  const canRestore = decideInSession(session, 'restore_document', { ...docTarget, stage: 'filed' as Lifecycle }).allowed
  const canDeprecate = docTarget.documentTypeId != null && stageManageGrant(session, docTarget.documentTypeId, 'deprecated') != null
  const canLock = decideInSession(session, 'lock_document', docTarget).allowed
  const canUnlock = decideInSession(session, 'unlock_document', docTarget).allowed
  const canDeleteDoc = decideInSession(session, 'delete_document', docTarget).allowed
  const canSupersedeTarget = decideInSession(session, 'edit_document', docTarget).allowed
  const [characterLinks, tagLinks, relationshipLinks] = await Promise.all([
    getDocumentCharacterLinks(payload, doc.id),
    getDocumentTags(payload, doc.id),
    payload.find({ collection: 'document-relationships', where: { or: [{ source: { equals: doc.id } }, { target: { equals: doc.id } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true }).catch(() => ({ docs: [] })),
  ])

  // Relationship rows are IDs only. Fetch linked-document metadata after the
  // current document is authorized, then apply the same read decision before
  // rendering a title, date, or credit for any related record.
  const linkedIds = [...new Set(relationshipLinks.docs.flatMap((link) => [relationId(link.source), relationId(link.target)]).filter((linkedId): linkedId is number => linkedId !== null && linkedId !== Number(doc.id)))]
  const linkedDocs = linkedIds.length === 0 ? { docs: [] } : await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: tenant.id } }, { id: { in: linkedIds } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, select: { id: true, domain: true, folder: true, documentType: true, title: true, createdAt: true, updatedAt: true, lifecycle: true }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  const readableLinked = new Map<number, typeof linkedDocs.docs[number]>()
  for (const linked of linkedDocs.docs) {
    const linkedRow = linked as unknown as { subdomain?: unknown; documentType?: unknown; privateDraft?: unknown; creatorCharacter?: unknown; lifecycle?: unknown }
    const extra: DocumentTargetExtra = {
      stage: (linkedRow.lifecycle ?? null) as Lifecycle | null,
      privateDraft: linkedRow.privateDraft === true,
      creatorCharacterId: relationId(linkedRow.creatorCharacter),
    }
    const target = resolveDocumentTarget(session, { id: Number(linked.id), folderId: relationId(linked.folder), subdomainId: relationId(linkedRow.subdomain), documentTypeId: relationId(linkedRow.documentType), ...extra })
    if (decideInSession(session, 'read', target).allowed) readableLinked.set(Number(linked.id), linked)
  }

  const supersedesLink = relationshipLinks.docs.find((link) => link.kind === 'supersedes' && relationId(link.source) === Number(doc.id) && readableLinked.has(relationId(link.target) ?? -1))
  const successorLink = relationshipLinks.docs.find((link) => link.kind === 'supersedes' && relationId(link.target) === Number(doc.id) && readableLinked.has(relationId(link.source) ?? -1))
  const supersededBy = successorLink ? readableLinked.get(relationId(successorLink.source) ?? -1) ?? null : null
  const supersededPreparedBy = supersededBy
    ? await getDocumentCharacterLinks(payload, supersededBy.id).catch(() => ({ docs: [] }))
    : { docs: [] }
  const supersededPreparedName = supersededPreparedBy.docs.find((link) => link.kind === 'prepared_by')?.character
  const supersededPreparedLabel = supersededPreparedName && typeof supersededPreparedName === 'object'
    ? supersededPreparedName.name
    : 'unknown Character'

  // P05R-T04 I: render ALL Prepared-by credits in deterministic order (by
  // link id) — services can store more than one, and showing only the first
  // would misrepresent the record.
  const preparedByLinks = characterLinks.docs.filter((link) => link.kind === 'prepared_by').sort((a, b) => Number(a.id) - Number(b.id))
  const preparedByLabel = preparedByLinks.map((link) => typeof link.character === 'object' && link.character ? link.character.name : `Character ${String(link.character)}`).join(', ') || 'No Character credit'
  const concernLinks = characterLinks.docs.filter((link) => link.kind === 'concerns')
  const html = renderMarkdown(doc.body)
  const base = `${baseUrl}/documents/${doc.id}`
  const isSuperseded = Boolean(successorLink)
  const supersededTarget = supersedesLink ? readableLinked.get(relationId(supersedesLink.target) ?? -1) ?? null : null

  return {
    baseUrl,
    domainSlug: tenant.slug,
    recordId: Number(doc.id),
    title: doc.title,
    bodyHtml: html,
    bodySource: source === '1' ? doc.body : null,
    meta: [
      { label: 'Prepared by', value: preparedByLabel },
      { label: 'Date', value: formatDate(doc.createdAt) },
    ],
    lifecycle: doc.lifecycle,
    locked: Boolean((doc as unknown as { locked?: unknown }).locked),
    isSuperseded,
    supersession: {
      supersededBy: supersededBy ? {
        id: Number(supersededBy.id),
        title: supersededBy.title,
        createdLabel: formatDate(supersededBy.createdAt),
        preparedByLabel: supersededPreparedLabel,
      } : null,
      supersedes: supersededTarget ? { id: Number(supersededTarget.id), title: supersededTarget.title } : null,
    },
    concerns: concernLinks.map((link) => ({
      name: typeof link.character === 'object' ? link.character.name : `Character ${link.character}`,
      ...(link.relationshipLabel ? { relationshipLabel: link.relationshipLabel } : {}),
    })),
    tags: tagLinks.docs.map((link) => typeof link.tag === 'object' ? link.tag.name : `Tag ${link.tag}`),
    preparedByLabel,
    capabilities: {
      edit: canEdit,
      submit: canSubmit,
      file: canFile,
      approve: canApprove,
      restore: canRestore,
      deprecate: canDeprecate,
      lock: canLock,
      unlock: canUnlock,
      delete: canDeleteDoc,
      supersede: canSupersedeTarget && canSupersedeDocument(doc.lifecycle),
    },
    routes: {
      editUrl: canEdit && !isSuperseded ? `${base}/edit` : null,
      historyUrl: `${base}/history`,
      supersedeUrl: canSupersedeTarget && !isSuperseded && canSupersedeDocument(doc.lifecycle) ? `${baseUrl}/records/new?supersedes=${doc.id}` : null,
    },
    statusMessage: errorCode && DOCUMENT_MUTATION_ERROR_MESSAGES[errorCode]
      ? { code: errorCode, text: DOCUMENT_MUTATION_ERROR_MESSAGES[errorCode] }
      : null,
  }
}
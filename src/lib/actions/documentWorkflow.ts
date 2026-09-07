'use server'

import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { domainAndIdWhere } from '@/lib/tenant/scope'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { transitionDocument, type WorkflowOperation } from '@/lib/documents/workflow'

type DomainActionContext = {
  payload: Awaited<ReturnType<typeof getPayload>>
  userId: number
  domain: { id: number; slug: string }
  actorCharacterId: number | null
}

async function resolveDomainAction(tenantSlug: string): Promise<DomainActionContext | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return null

  // P08-GATE-01: take the active Character from the selected context as-is.
  // The authorization session decides whether it is the matching domain_admin,
  // a valid member, or unauthorized. Never second-guess the four-kind model
  // with a legacy membership test (domain_admin intentionally has none).
  const active = await getActiveContext()
  const actorCharacterId = active.tenant?.slug === tenantSlug && active.activeCharacter ? Number(active.activeCharacter.id) : null
  return { payload, userId: Number(user.id), domain: { id: Number(domain.id), slug: domain.slug }, actorCharacterId }
}

function reviewPath(tenantSlug: string, documentId: string | number, error?: string) {
  const suffix = error ? `?error=${encodeURIComponent(error)}` : ''
  return `/domain/${tenantSlug}/documents/${documentId}/history${suffix}`
}

/** Submit a Draft into Submitted, or apply a supervisor/transition operation. */
export async function documentWorkflowAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const documentId = String(formData.get('documentId') ?? '').trim()
  const operation = String(formData.get('operation') ?? '').trim() as WorkflowOperation
  const note = String(formData.get('note') ?? '').trim() || null
  const destination = reviewPath(tenantSlug, documentId)
  if (!tenantSlug || !documentId || !['submit', 'file', 'approve', 'reject', 'deprecate', 'restore', 'lock', 'unlock'].includes(operation)) redirect('/')

  const ctx = await resolveDomainAction(tenantSlug)
  if (!ctx) redirect(destination + '?error=unauthorized')
  const current = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.domain.id, documentId), depth: 0, limit: 1 })
  if (!current.docs[0] || current.docs[0].softDeletedAt) redirect(destination + '?error=not-found')

  if (operation === 'submit' && !ctx.actorCharacterId) redirect(destination + '?error=character-required')

  try {
    await transitionDocument({ payload: ctx.payload, userId: ctx.userId, domainId: ctx.domain.id, documentId, actorCharacterId: ctx.actorCharacterId, operation, note })
  } catch (error) {
    const code = error instanceof Error && /cannot be|not found|not part of|no longer part of/i.test(error.message) ? 'invalid-transition' : 'failed'
    redirect(destination + `?error=${code}`)
  }
  // P08X-T07: deprecate/restore land back on the record so its new stage is
  // visible; submit returns to the review flow; everything else returns to
  // the Review queue.
  redirect(operation === 'submit' ? reviewPath(tenantSlug, documentId) : operation === 'deprecate' || operation === 'restore' ? `/domain/${tenantSlug}/documents/${documentId}` : `/domain/${tenantSlug}/review`)
}

/** Soft-delete a record while retaining its ID, revisions, and provenance. */
export async function softDeleteDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const documentId = String(formData.get('documentId') ?? '').trim()
  const ctx = await resolveDomainAction(tenantSlug)
  if (!ctx || !documentId) redirect(`/domain/${tenantSlug}/records`)
  const result = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.domain.id, documentId), depth: 0, limit: 1 })
  const document = result.docs[0]
  if (!document) redirect(`/domain/${tenantSlug}/records`)
  const { runInTransaction } = await import('@/lib/documents/relationships')
  try {
    await runInTransaction(ctx.payload, async (transactionID) => {
      const req = { transactionID }
      const fresh = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.domain.id, document.id), depth: 0, limit: 1, req })
      if (!fresh.docs[0] || fresh.docs[0].softDeletedAt) throw new Error('not-found')
      try { const { requirePermission } = await import('@/lib/authz/evaluate'); await requirePermission({ payload: ctx.payload, actor: { userId: ctx.userId, activeCharacterId: ctx.actorCharacterId }, domainId: ctx.domain.id, capability: 'delete_document', resource: { type: 'Document', id: document.id }, transactionID }) } catch { throw new Error('forbidden') }
      await ctx.payload.update({ collection: 'documents', id: document.id, data: { softDeletedAt: new Date().toISOString(), softDeletedBy: ctx.userId }, depth: 0, req })
      await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.domain.id, documentId: document.id, eventType: 'soft_deleted', actorUserId: ctx.userId, actorCharacterId: ctx.actorCharacterId, context: { soft: true }, revisionId: await latestDocumentRevisionId(ctx.payload, document.id, transactionID), transactionID })
    })
  } catch { redirect(`/domain/${tenantSlug}/records?error=forbidden`) }
  redirect(`/domain/${tenantSlug}/records`)
}

/** Restore a soft-deleted record; permanent deletion is not an app action. */
export async function restoreSoftDeletedDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const documentId = String(formData.get('documentId') ?? '').trim()
  const destination = reviewPath(tenantSlug, documentId)
  const ctx = await resolveDomainAction(tenantSlug)
  if (!ctx || !documentId) redirect('/')
  const { runInTransaction: runRestoreTx } = await import('@/lib/documents/relationships')
  try {
    await runRestoreTx(ctx.payload, async (transactionID) => {
      const req = { transactionID }
      try { const { requirePermission } = await import('@/lib/authz/evaluate'); await requirePermission({ payload: ctx.payload, actor: { userId: ctx.userId, activeCharacterId: ctx.actorCharacterId }, domainId: ctx.domain.id, capability: 'restore_document', resource: { type: 'Document', id: documentId }, transactionID }) } catch { throw new Error('forbidden') }
      const result = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.domain.id, documentId), depth: 0, limit: 1, req })
      const document = result.docs[0]
      if (!document) throw new Error('not-found')
      await ctx.payload.update({ collection: 'documents', id: document.id, data: { softDeletedAt: null, softDeletedBy: null }, depth: 0, req })
      await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.domain.id, documentId: document.id, eventType: 'restored', actorUserId: ctx.userId, actorCharacterId: ctx.actorCharacterId, context: { soft: true }, revisionId: await latestDocumentRevisionId(ctx.payload, document.id, transactionID), transactionID })
    })
  } catch { redirect(destination + '?error=forbidden') }
  redirect(destination)
}

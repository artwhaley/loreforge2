'use server'

import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { domainAndIdWhere } from '@/lib/tenant/scope'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { requireInterimWorkflowAuthority, transitionDocument, type WorkflowOperation } from '@/lib/documents/workflow'

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

  const active = await getActiveContext()
  let actorCharacterId: number | null = null
  if (active.tenant?.slug === tenantSlug && active.activeCharacter) {
    const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: active.activeCharacter.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
    if (membership.docs[0]) actorCharacterId = Number(active.activeCharacter.id)
  }
  return { payload, userId: Number(user.id), domain: { id: Number(domain.id), slug: domain.slug }, actorCharacterId }
}

function reviewPath(tenantSlug: string, documentId: string | number, error?: string) {
  const suffix = error ? `?error=${encodeURIComponent(error)}` : ''
  return `/domain/${tenantSlug}/documents/${documentId}/history${suffix}`
}

/** Submit a Draft as Pending Review, or apply an interim supervisor transition. */
export async function documentWorkflowAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const documentId = String(formData.get('documentId') ?? '').trim()
  const operation = String(formData.get('operation') ?? '').trim() as WorkflowOperation
  const note = String(formData.get('note') ?? '').trim() || null
  const destination = reviewPath(tenantSlug, documentId)
  if (!tenantSlug || !documentId || !['submit', 'file', 'approve', 'reject', 'lock', 'unlock'].includes(operation)) redirect('/')

  const ctx = await resolveDomainAction(tenantSlug)
  if (!ctx) redirect(destination + '?error=unauthorized')
  const current = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.domain.id, documentId), depth: 0, limit: 1 })
  if (!current.docs[0] || current.docs[0].softDeletedAt) redirect(destination + '?error=not-found')

  // Submit is a Character-scoped action for ordinary members. All supervisory
  // transitions (including direct file) remain behind the pre-P07 boundary.
  if (operation !== 'submit') {
    try { await requireInterimWorkflowAuthority(ctx.payload, ctx.userId, ctx.domain.id) } catch { redirect(destination + '?error=forbidden') }
  } else if (!ctx.actorCharacterId) {
    try { await requireInterimWorkflowAuthority(ctx.payload, ctx.userId, ctx.domain.id) } catch { redirect(destination + '?error=character-required') }
  }

  try {
    await transitionDocument({ payload: ctx.payload, userId: ctx.userId, domainId: ctx.domain.id, documentId, actorCharacterId: ctx.actorCharacterId, operation, note })
  } catch (error) {
    const code = error instanceof Error && /cannot be|not found/i.test(error.message) ? 'invalid-transition' : 'failed'
    redirect(destination + `?error=${code}`)
  }
  redirect(operation === 'submit' ? reviewPath(tenantSlug, documentId) : `/domain/${tenantSlug}/review`)
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
  if (!ctx.actorCharacterId) {
    try { await requireInterimWorkflowAuthority(ctx.payload, ctx.userId, ctx.domain.id) } catch { redirect(`/domain/${tenantSlug}/records?error=forbidden`) }
  }
  await ctx.payload.update({ collection: 'documents', id: document.id, data: { softDeletedAt: new Date().toISOString(), softDeletedBy: ctx.userId }, depth: 0 })
  await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.domain.id, documentId: document.id, eventType: 'soft_deleted', actorUserId: ctx.userId, actorCharacterId: ctx.actorCharacterId, context: { soft: true }, revisionId: await latestDocumentRevisionId(ctx.payload, document.id) })
  redirect(`/domain/${tenantSlug}/records`)
}

/** Restore a soft-deleted record; permanent deletion is not an app action. */
export async function restoreSoftDeletedDocumentAction(formData: FormData): Promise<void> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const documentId = String(formData.get('documentId') ?? '').trim()
  const destination = reviewPath(tenantSlug, documentId)
  const ctx = await resolveDomainAction(tenantSlug)
  if (!ctx || !documentId) redirect('/')
  try { await requireInterimWorkflowAuthority(ctx.payload, ctx.userId, ctx.domain.id) } catch { redirect(destination + '?error=forbidden') }
  const result = await ctx.payload.find({ collection: 'documents', where: domainAndIdWhere(ctx.domain.id, documentId), depth: 0, limit: 1 })
  const document = result.docs[0]
  if (!document) redirect(destination + '?error=not-found')
  await ctx.payload.update({ collection: 'documents', id: document.id, data: { softDeletedAt: null, softDeletedBy: null }, depth: 0 })
  await recordDocumentProvenance({ payload: ctx.payload, domainId: ctx.domain.id, documentId: document.id, eventType: 'restored', actorUserId: ctx.userId, actorCharacterId: ctx.actorCharacterId, context: { soft: true }, revisionId: await latestDocumentRevisionId(ctx.payload, document.id) })
  redirect(destination)
}

'use server'

import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { requirePermission } from '@/lib/authz/evaluate'
import { domainAndIdWhere } from '@/lib/tenant/scope'

function historyPath(tenantSlug: string, documentId: string | number, error?: string): string {
  const suffix = error ? `?error=${encodeURIComponent(error)}` : ''
  return `/domain/${tenantSlug}/documents/${documentId}/history${suffix}`
}

/**
 * Restore a same-document historical version as the new current revision.
 *
 * Version IDs are opaque and globally addressable in Payload, so the action
 * first proves that the requested version belongs to the currently selected
 * Domain-scoped document. The current and restored lifecycle states must both
 * be editable; Payload then writes the restore as a fresh version.
 */
export async function restoreDocumentVersionAction(formData: FormData): Promise<never> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const documentId = String(formData.get('documentId') ?? '').trim()
  const versionId = String(formData.get('versionId') ?? '').trim()
  const destination = historyPath(tenantSlug, documentId)
  if (!tenantSlug || !documentId || !versionId) redirect('/')

  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) redirect(destination + '?error=unauthorized')

  const domainResult = await payload.find({
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const domain = domainResult.docs[0]
  if (domain) {
    const currentResult = await payload.find({
      collection: 'documents',
      where: domainAndIdWhere(domain.id, documentId),
      depth: 0,
      limit: 1,
    })
    const current = currentResult.docs[0]
    if (!current) redirect(destination + '?error=not-found')
    try { await requirePermission({ payload, actor: { userId: user.id }, domainId: domain.id, capability: 'restore_document', resource: { type: 'Document', id: current.id } }) } catch { redirect(destination + '?error=forbidden') }
    if (!canEditDocumentBody(current.lifecycle)) redirect(destination + '?error=current-read-only')

    const version = await payload.findVersionByID({ collection: 'documents', id: versionId, depth: 0, disableErrors: true })
    if (!version || String(version.parent) !== String(current.id)) redirect(destination + '?error=wrong-document')
    if (!canEditDocumentBody(version.version.lifecycle)) redirect(destination + '?error=version-read-only')

    await payload.restoreVersion({ collection: 'documents', id: versionId, depth: 0, context: { authorizationChecked: true } })
    await recordDocumentProvenance({ payload, domainId: domain.id, documentId: current.id, eventType: 'restored', actorUserId: user.id, context: { restoredVersionId: versionId }, revisionId: await latestDocumentRevisionId(payload, current.id) })
    redirect(destination)
  }

  redirect(destination + '?error=not-found')
}

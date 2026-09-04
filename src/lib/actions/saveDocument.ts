'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { isAllowed } from '@/lib/authz/evaluate'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { domainAndIdWhere } from '@/lib/tenant/scope'

/**
 * Save an archive document's title and canonical Markdown body.
 *
 * Verifies the session user is a member of the document's tenant server-side,
 * then confirms the document actually belongs to that tenant before updating.
 * Only canonical Markdown is stored — never HTML.
 */
export async function saveDocumentAction(input: {
  documentId: number | string
  tenantSlug: string
  title: string
  body: string
}): Promise<{ ok: boolean }> {
  const { documentId, tenantSlug, title, body } = input
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })

  if (!user) {
    return { ok: false }
  }

  const domains = await payload.find({
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const domain = domains.docs[0]
  if (domain) {
    const existing = await payload.find({ collection: 'documents', where: domainAndIdWhere(domain.id, documentId), depth: 0, limit: 1 })
    if (existing.docs.length === 0) return { ok: false }
    const active = await getActiveContext()
    if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: active.tenant?.slug === tenantSlug ? active.activeCharacter?.id : null }, domainId: domain.id, capability: 'edit_document', resource: { type: 'Document', id: documentId } })) return { ok: false }
    if (!canEditDocumentBody(existing.docs[0].lifecycle)) return { ok: false }
    await payload.update({ collection: 'documents', id: documentId, data: { title, body: canonicalizeMarkdown(body) }, depth: 0 })
    const activeContext = await getActiveContext()
    const actorCharacter = activeContext.tenant?.slug === tenantSlug ? activeContext.activeCharacter : null
    await recordDocumentProvenance({ payload, domainId: domain.id, documentId, eventType: 'edited', actorUserId: user.id, actorCharacterId: actorCharacter?.id, context: { fields: ['title', 'body'] }, revisionId: await latestDocumentRevisionId(payload, documentId) })
    payload.logger.info(`Saved document ${documentId}`)
    return { ok: true }
  }

  return { ok: false }
}

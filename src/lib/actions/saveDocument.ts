'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { domainAndIdWhere, tenantAndIdWhere } from '@/lib/tenant/scope'

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
    const ownerId = typeof domain.ownerUser === 'object' ? domain.ownerUser?.id : domain.ownerUser
    const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domain.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
    const controlled = await payload.find({ collection: 'characters', where: { and: [{ controlledBy: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 200 })
    const memberships = controlled.docs.length
      ? await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { in: controlled.docs.map((character) => character.id) } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
      : { docs: [] }
    if (Number(ownerId) !== Number(user.id) && admins.docs.length === 0 && memberships.docs.length === 0) return { ok: false }
    const existing = await payload.find({ collection: 'documents', where: domainAndIdWhere(domain.id, documentId), depth: 0, limit: 1 })
    if (existing.docs.length === 0) return { ok: false }
    if (!canEditDocumentBody(existing.docs[0].lifecycle)) return { ok: false }
    await payload.update({ collection: 'documents', id: documentId, data: { title, body: canonicalizeMarkdown(body) }, depth: 0 })
    payload.logger.info(`Saved document ${documentId}`)
    return { ok: true }
  }

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    return { ok: false }
  }

  const memberships = await payload.find({
    collection: 'memberships',
    where: {
      and: [{ user: { equals: user.id } }, { tenant: { equals: tenant.id } }],
    },
    depth: 0,
    limit: 1,
  })
  if (memberships.docs.length === 0) {
    return { ok: false } // not a member of this tenant
  }

  // Confirm the document lives in this tenant before mutating it.
  const existing = await payload.find({
    collection: 'documents',
    where: tenantAndIdWhere(tenant.id, documentId),
    depth: 0,
    limit: 1,
  })
  if (existing.docs.length === 0) {
    return { ok: false }
  }
  if (!canEditDocumentBody(existing.docs[0].lifecycle)) return { ok: false }

  await payload.update({
    collection: 'documents',
    id: documentId,
    data: { title, body: canonicalizeMarkdown(body) },
    depth: 0,
  })

  payload.logger.info(`Saved document ${documentId}`)
  return { ok: true }
}

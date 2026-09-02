'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'

/**
 * Save an informational page's title and canonical Markdown body.
 *
 * Verifies the session user is a member of the page's tenant server-side, then
 * confirms the page actually belongs to that tenant before updating. Prose stays
 * canonical Markdown — never HTML.
 */
export async function savePageAction(input: {
  pageId: number | string
  tenantSlug: string
  title: string
  body: string
}): Promise<{ ok: boolean }> {
  const { pageId, tenantSlug, title, body } = input
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })

  if (!user) {
    return { ok: false }
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

  const existing = await payload.find({
    collection: 'pages',
    where: {
      and: [{ tenant: { equals: tenant.id } }, { id: { equals: pageId } }],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs.length === 0) {
    return { ok: false }
  }

  await payload.update({
    collection: 'pages',
    id: pageId,
    data: { title, body: canonicalizeMarkdown(body) },
    depth: 0,
  })

  payload.logger.info(`Saved page ${pageId}`)
  return { ok: true }
}

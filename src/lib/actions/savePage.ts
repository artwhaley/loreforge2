'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { isAllowed } from '@/lib/authz/evaluate'

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
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    return { ok: false }
  }

  if (!await isAllowed({ payload, actor: { userId: user.id }, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) return { ok: false }

  const existing = await payload.find({
    collection: 'pages',
    where: {
      and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { id: { equals: pageId } }],
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

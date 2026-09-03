import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { attachDocumentTag, detachDocumentTag, findOrCreateDomainTag } from '@/lib/documents/links'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const documentId = Number(form.get('documentId') ?? '')
  const action = String(form.get('action') ?? 'add')
  const destination = `/domain/${domainSlug}/documents/${documentId}`
  if (!user || !domainSlug || !Number.isFinite(documentId)) return NextResponse.redirect(new URL(destination, request.url), 303)
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.redirect(new URL(destination, request.url), 303)
  try {
    const actor = { userId: user.id }
    if (action === 'remove') {
      const tagId = Number(form.get('tagId') ?? '')
      if (Number.isFinite(tagId)) await detachDocumentTag({ payload, domainId: domain.id, documentId, tagId, actor })
    } else {
      const name = String(form.get('tagName') ?? '').trim()
      if (name) {
        const tag = await findOrCreateDomainTag({ payload, domainId: domain.id, name, actor })
        await attachDocumentTag({ payload, domainId: domain.id, documentId, tagId: tag.id, actor })
      }
    }
  } catch {
    // Keep customer-facing output free of schema/provider details.
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { addDocumentRelationship, removeDocumentRelationship } from '@/lib/documents/relationships'

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
      const relationshipId = Number(form.get('relationshipId') ?? '')
      if (Number.isFinite(relationshipId)) await removeDocumentRelationship({ payload, domainId: domain.id, relationshipId, actor })
    } else {
      const targetId = Number(form.get('targetId') ?? '')
      const kind = String(form.get('kind') ?? '') as 'grouped' | 'supersedes'
      if (Number.isFinite(targetId)) await addDocumentRelationship({ payload, domainId: domain.id, sourceId: documentId, targetId, kind, label: String(form.get('label') ?? ''), actor })
    }
  } catch {
    // Do not expose authorization or provider details through a redirect.
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

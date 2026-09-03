import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { revokeDocumentShare, shareDocument } from '@/lib/documents/sharing'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const documentId = Number(form.get('documentId') ?? '')
  const action = String(form.get('action') ?? 'share')
  const destination = `/domain/${domainSlug}/documents/${documentId}`
  if (!user || !domainSlug || !Number.isFinite(documentId)) return NextResponse.redirect(new URL(destination, request.url), 303)
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.redirect(new URL(destination, request.url), 303)
  try {
    const principalType = String(form.get('principalType') ?? 'Character') as 'User' | 'Character'
    const principalId = Number(form.get('principalId') ?? '')
    const capability = String(form.get('capability') ?? 'read') as 'read' | 'edit_document'
    if (action === 'revoke') await revokeDocumentShare({ payload, domainId: domain.id, documentId, principalType, principalId, capability, actorUserId: user.id })
    else if (Number.isFinite(principalId)) await shareDocument({ payload, domainId: domain.id, documentId, principalType, principalId, capability, actorUserId: user.id })
  } catch {
    // Stable redirect; do not leak recipient or provider details.
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

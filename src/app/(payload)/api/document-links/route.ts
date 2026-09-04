import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { documentMutationErrorCode } from '@/lib/documents/errorCodes'
import { attachDocumentCharacterLink, detachDocumentCharacterLink } from '@/lib/documents/links'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const documentId = Number(form.get('documentId') ?? '')
  const characterId = Number(form.get('characterId') ?? '')
  const kind = String(form.get('kind') ?? '') as 'prepared_by' | 'concerns'
  const action = String(form.get('action') ?? 'add')
  const destination = `/domain/${domainSlug}/documents/${documentId}`
  if (!user || !domainSlug || !Number.isFinite(documentId) || !Number.isFinite(characterId) || !['prepared_by', 'concerns'].includes(kind)) return NextResponse.redirect(new URL(destination, request.url), 303)
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.redirect(new URL(destination, request.url), 303)
  try {
    const actor = { userId: user.id }
    if (action === 'remove') await detachDocumentCharacterLink({ payload, domainId: domain.id, documentId, characterId, kind, actor })
    else await attachDocumentCharacterLink({ payload, domainId: domain.id, documentId, characterId, kind, relationshipLabel: String(form.get('relationshipLabel') ?? ''), actor })
  } catch (error) {
    // P05R-T06 E: failures must visibly fail with a stable message code.
    const code = documentMutationErrorCode(error)
    const target = `${destination}${destination.includes('?') ? '&' : '?'}error=${code}`
    return NextResponse.redirect(new URL(target, request.url), 303)
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

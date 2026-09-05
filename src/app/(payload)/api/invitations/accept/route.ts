import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { isInvitationToken } from '@/lib/invitations/types'
import { resolveInvitation } from '@/lib/invitations/service'
import { acceptCharacterInvitation, acceptDomainBootstrapInvitation, acceptDomainJoinInvitation } from '@/lib/invitations/workflows'

function redirectToInvite(request: Request, token: string, key: 'accepted' | 'error', value: string): NextResponse {
  const destination = new URL(`/invite/${encodeURIComponent(token)}`, request.url)
  destination.searchParams.set(key, value)
  return NextResponse.redirect(destination, 303)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const token = isInvitationToken(formData.get('token')) ? String(formData.get('token')) : null
  if (!token) return NextResponse.redirect(new URL('/', request.url), 303)
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return redirectToInvite(request, token, 'error', 'login')
    const invitation = await resolveInvitation(payload, token)
    if (invitation.status !== 'valid' || !invitation.invitation) return redirectToInvite(request, token, 'error', 'invalid')
    const purpose = invitation.invitation.purpose
    const result = purpose === 'domain_bootstrap'
      ? await acceptDomainBootstrapInvitation(payload, { userId: user.id, token })
      : purpose === 'character_claim'
        ? await acceptCharacterInvitation(payload, { userId: user.id, token })
        : await acceptDomainJoinInvitation(payload, { userId: user.id, token, characterId: String(formData.get('characterId') ?? '') || null, requestedName: String(formData.get('requestedName') ?? '') || null })
    if (!result.ok) return redirectToInvite(request, token, 'error', 'invalid')
    return redirectToInvite(request, token, 'accepted', purpose)
  } catch {
    return redirectToInvite(request, token, 'error', 'invalid')
  }
}

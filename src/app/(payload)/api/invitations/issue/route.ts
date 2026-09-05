import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { isInvitationPurpose } from '@/lib/invitations/types'
import { issueCharacterInvitation, issueDomainBootstrapInvitation, issueDomainJoinInvitation } from '@/lib/invitations/workflows'

function failure(request: Request, destination: string): NextResponse {
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const purpose = String(formData.get('purpose') ?? '')
  const domainId = Number(formData.get('domainId') ?? '')
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const fallback = tenantSlug ? `/domain/${encodeURIComponent(tenantSlug)}/manage/invitations` : '/work'
  if (!isInvitationPurpose(purpose) || !Number.isInteger(domainId)) return failure(request, fallback)
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return failure(request, fallback)
    const context = await getActiveContext()
    const actor = { userId: user.id, activeCharacterId: context.activeCharacter?.id ?? null }
    const expiresRaw = String(formData.get('expiresAt') ?? '').trim()
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null
    if (expiresAt && !Number.isFinite(expiresAt.getTime())) return failure(request, fallback)
    const maxUsesRaw = String(formData.get('maxUses') ?? '').trim()
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null
    const result = purpose === 'domain_bootstrap'
      ? await issueDomainBootstrapInvitation(payload, { actor, domainId, expiresAt })
      : purpose === 'character_claim'
        ? await issueCharacterInvitation(payload, { actor, domainId, characterId: Number(formData.get('characterId') ?? ''), expiresAt })
        : await issueDomainJoinInvitation(payload, { actor, domainId, expiresAt, maxUses })
    if (!result.ok) return failure(request, fallback)
    const destination = new URL(fallback, request.url)
    destination.searchParams.set('issued', result.token)
    return NextResponse.redirect(destination, 303)
  } catch {
    return failure(request, fallback)
  }
}

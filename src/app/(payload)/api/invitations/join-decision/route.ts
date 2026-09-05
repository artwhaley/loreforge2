import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { decideDomainJoinRequest } from '@/lib/invitations/workflows'

export async function POST(request: Request) {
  const formData = await request.formData()
  const requestId = Number(formData.get('requestId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const fallback = tenantSlug ? `/domain/${encodeURIComponent(tenantSlug)}/manage/invitations` : '/platform/work'
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user || (decision !== 'approved' && decision !== 'rejected') || !Number.isInteger(requestId)) return NextResponse.redirect(new URL(`${fallback}?error=invalid`, request.url), 303)
    const context = await getActiveContext()
    const result = await decideDomainJoinRequest(payload, { actor: { userId: user.id, activeCharacterId: context.activeCharacter?.id ?? null }, requestId, decision: decision as 'approved' | 'rejected', note: String(formData.get('note') ?? '') })
    return NextResponse.redirect(new URL(result.ok ? `${fallback}?decided=1` : `${fallback}?error=invalid`, request.url), 303)
  } catch {
    return NextResponse.redirect(new URL(`${fallback}?error=invalid`, request.url), 303)
  }
}


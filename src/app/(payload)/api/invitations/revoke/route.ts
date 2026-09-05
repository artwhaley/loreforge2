import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { revokeDomainInvitation } from '@/lib/invitations/workflows'

export async function POST(request: Request) {
  const formData = await request.formData()
  const invitationId = Number(formData.get('invitationId') ?? '')
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim()
  const fallback = tenantSlug ? `/domain/${encodeURIComponent(tenantSlug)}/manage/invitations` : '/platform/work'
  if (!Number.isInteger(invitationId)) return NextResponse.redirect(new URL(fallback, request.url), 303)
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return NextResponse.redirect(new URL(fallback, request.url), 303)
    const context = await getActiveContext()
    const result = await revokeDomainInvitation(payload, { actor: { userId: user.id, activeCharacterId: context.activeCharacter?.id ?? null }, invitationId })
    return NextResponse.redirect(new URL(`${fallback}${result.ok ? '?revoked=1' : '?error=invalid'}`, request.url), 303)
  } catch {
    return NextResponse.redirect(new URL(`${fallback}?error=invalid`, request.url), 303)
  }
}


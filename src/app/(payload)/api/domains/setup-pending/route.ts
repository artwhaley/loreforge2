import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { createSetupPendingDomain } from '@/lib/invitations/workflows'

export async function POST(request: Request) {
  const formData = await request.formData()
  const name = String(formData.get('name') ?? '')
  const slug = String(formData.get('slug') ?? '')
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return NextResponse.redirect(new URL('/platform/work?error=login', request.url), 303)
    const context = await getActiveContext()
    const result = await createSetupPendingDomain(payload, { actor: { userId: user.id, activeCharacterId: context.activeCharacter?.id ?? null }, name, slug })
    return NextResponse.redirect(new URL(result.ok ? `/platform/work?created=${encodeURIComponent(result.domain.slug ?? slug)}` : '/platform/work?error=invalid', request.url), 303)
  } catch {
    return NextResponse.redirect(new URL('/platform/work?error=invalid', request.url), 303)
  }
}


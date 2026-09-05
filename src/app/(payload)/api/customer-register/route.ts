import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { resolveInvitation } from '@/lib/invitations/service'
import { isInvitationToken } from '@/lib/invitations/types'

function failure(request: Request, token: string | null): NextResponse {
  const destination = new URL('/create-account', request.url)
  if (token) destination.searchParams.set('invite', token)
  destination.searchParams.set('error', 'invalid')
  return NextResponse.redirect(destination, 303)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const invite = isInvitationToken(formData.get('invite')) ? String(formData.get('invite')) : null
  if (!invite) return failure(request, null)
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!name || name.length > 160 || !email || !password || password.length < 12) return failure(request, invite)
  try {
    const payload = await getPayload({ config })
    const resolved = await resolveInvitation(payload, invite)
    if (resolved.status !== 'valid' || !resolved.invitation) return failure(request, invite)
    await payload.create({ collection: 'users', overrideAccess: true, data: { name, email, password, slVerificationState: 'unlinked' } as never })
    const login = await payload.login({ collection: 'users', data: { email, password } })
    if (!login.token) throw new Error('Registration did not return a session token.')
    const destination = new URL(`/invite/${encodeURIComponent(invite)}`, request.url)
    const response = NextResponse.redirect(destination, 303)
    response.cookies.set(`${payload.config.cookiePrefix}-token`, login.token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
    return response
  } catch {
    // Keep the invitation context, but never include token material in a log or
    // error payload. The user-facing response is intentionally generic.
    return failure(request, invite)
  }
}


import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { isInvitationToken } from '@/lib/invitations/types'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const remember = formData.get('remember') === '1'
  const invite = isInvitationToken(formData.get('invite')) ? String(formData.get('invite')) : null
  const destination = new URL(invite ? `/invite/${encodeURIComponent(invite)}` : '/', request.url)
  if (!email || !password) {
    destination.searchParams.set('error', 'invalid')
    if (invite) destination.searchParams.set('invite', invite)
    return NextResponse.redirect(destination, 303)
  }
  try {
    const payload = await getPayload({ config })
    const result = await payload.login({ collection: 'users', data: { email, password } })
    if (!result.token) throw new Error('Login did not return a session token.')
    const response = NextResponse.redirect(destination, 303)
    response.cookies.set(`${payload.config.cookiePrefix}-token`, result.token, { httpOnly: true, sameSite: 'lax', path: '/', ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}) })
    return response
  } catch {
    const failed = new URL('/', request.url)
    failed.searchParams.set('error', 'invalid')
    if (invite) failed.searchParams.set('invite', invite)
    return NextResponse.redirect(failed, 303)
  }
}

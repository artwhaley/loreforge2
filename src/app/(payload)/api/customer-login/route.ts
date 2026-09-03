import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const remember = formData.get('remember') === '1'
  const destination = new URL('/', request.url)
  if (!email || !password) {
    destination.searchParams.set('error', 'invalid')
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
    destination.searchParams.set('error', 'invalid')
    return NextResponse.redirect(destination, 303)
  }
}

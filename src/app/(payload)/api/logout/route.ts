import { NextResponse } from 'next/server'
import { createLocalReq, getPayload, logoutOperation } from 'payload'

import config from '@payload-config'

import { ACTIVE_CHARACTER_COOKIE, ACTIVE_TENANT_COOKIE } from '@/lib/tenant/activeTenant'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const response = NextResponse.redirect(new URL('/', request.url), 303)

  if (user && payload.collections[user.collection]) {
    try {
      const req = await createLocalReq({ user }, payload)
      await logoutOperation({ collection: payload.collections[user.collection], req, allSessions: false })
    } catch (error) {
      payload.logger.error({ err: error, msg: 'Logout session cleanup failed; clearing browser credentials anyway.' })
    }
  }

  response.cookies.set(`${payload.config.cookiePrefix}-token`, '', { expires: new Date(0), maxAge: 0, httpOnly: true, path: '/' })
  response.cookies.delete(ACTIVE_CHARACTER_COOKIE)
  response.cookies.delete(ACTIVE_TENANT_COOKIE)
  return response
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@payload-config'

import { ACTIVE_CHARACTER_COOKIE, ACTIVE_TENANT_COOKIE } from '@/lib/tenant/activeTenant'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const formData = await request.formData()
  const rawCharacterId = String(formData.get('characterId') ?? '')
  const characterId = Number(rawCharacterId)
  const requestedReturnTo = String(formData.get('returnTo') ?? '')
  const returnTo = requestedReturnTo.startsWith('/') && !requestedReturnTo.startsWith('//') ? requestedReturnTo : '/'
  const wantsJson = request.headers.get('x-loreforge-character-switch') === 'fetch' || request.headers.get('accept')?.includes('application/json')
  const finish = (target: string, response?: NextResponse) => {
    if (wantsJson) return NextResponse.json({ redirectTo: target }, response ? { headers: response.headers } : undefined)
    return NextResponse.redirect(new URL(target, request.url), 303)
  }

  const response = wantsJson ? NextResponse.json({ redirectTo: returnTo }) : NextResponse.redirect(new URL(returnTo, request.url), 303)
  if (!user) return response

  if (!rawCharacterId) {
    response.cookies.delete(ACTIVE_CHARACTER_COOKIE)
    return response
  }

  if (!Number.isFinite(characterId)) return finish('/')

  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 }).catch(() => null)
  if (!character) return finish('/')
  const controlledBy = typeof character.controlledBy === 'object' ? character.controlledBy?.id : character.controlledBy
  if (character.status !== 'active' || String(controlledBy) !== String(user.id)) return finish('/')

  response.cookies.set(ACTIVE_CHARACTER_COOKIE, String(character.id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  // P07X-T02: keep the selected Domain only when this identity is eligible
  // there (active member Character; platform_admin anywhere; domain_admin only
  // inside its own administrativeDomain). The switch never silently changes
  // Domain context.
  const { isIdentityValidInDomain } = await import('@/lib/characters/identitySelect')
  const cookieStore = await cookies()
  const tenantSlug = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value
  if (tenantSlug) {
    const domains = await payload.find({ collection: 'domains', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
    const domain = domains.docs[0]
    if (domain) {
      const accountRow = await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }).catch(() => null)
      const valid = await isIdentityValidInDomain(payload, { userId: user.id, characterId: character.id, domainId: domain.id, userIsPlatformAdmin: Boolean((accountRow as { isPlatformAdmin?: unknown } | null)?.isPlatformAdmin) })
      if (!valid) {
        // A stale Domain from another account must not prevent selecting a
        // Character on the Loreforge dashboard. Leave that Domain, not the
        // newly selected identity.
        response.cookies.delete(ACTIVE_TENANT_COOKIE)
        if (returnTo === `/domain/${tenantSlug}` || returnTo.startsWith(`/domain/${tenantSlug}/`)) {
          if (wantsJson) return NextResponse.json({ redirectTo: '/' }, { headers: response.headers })
          const redirect = NextResponse.redirect(new URL('/', request.url), 303)
          for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
          return redirect
        }
      }
    }
  }
  if (wantsJson) return NextResponse.json({ redirectTo: returnTo }, { headers: response.headers })
  return response
}

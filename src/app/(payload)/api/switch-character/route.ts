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

  const response = NextResponse.redirect(new URL('/', request.url), 303)
  if (!user) return response

  if (!rawCharacterId) {
    response.cookies.delete(ACTIVE_CHARACTER_COOKIE)
    return response
  }

  if (!Number.isFinite(characterId)) return response

  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 })
  if (!character) return response
  const controlledBy = typeof character.controlledBy === 'object' ? character.controlledBy?.id : character.controlledBy
  if (character.status !== 'active' || String(controlledBy) !== String(user.id)) {
    return response
  }

  response.cookies.set(ACTIVE_CHARACTER_COOKIE, String(character.id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  // Keep the selected Domain only when this Character is eligible there. The
  // Character switch never silently changes Domain context.
  const cookieStore = await cookies()
  const tenantSlug = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value
  if (tenantSlug) {
    const domains = await payload.find({ collection: 'domains', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
    const domain = domains.docs[0]
    if (domain) {
      const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: character.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
      if (!membership.docs[0]) response.cookies.delete(ACTIVE_CHARACTER_COOKIE)
    }
  }
  return response
}

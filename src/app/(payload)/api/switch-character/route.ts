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
    response.cookies.delete(ACTIVE_TENANT_COOKIE)
    return response
  }

  if (!Number.isFinite(characterId)) return response

  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 })
  const controlledBy = typeof character.controlledBy === 'object' ? character.controlledBy?.id : character.controlledBy
  if (!character || character.status !== 'active' || String(controlledBy) !== String(user.id)) {
    return response
  }

  // A Character change never carries the old Domain across the identity seam.
  response.cookies.set(ACTIVE_CHARACTER_COOKIE, String(character.id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  response.cookies.delete(ACTIVE_TENANT_COOKIE)
  return response
}

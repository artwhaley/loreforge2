import { NextResponse } from 'next/server'
import { cookies } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@payload-config'

import { ACTIVE_CHARACTER_COOKIE, ACTIVE_TENANT_COOKIE, ADMINISTRATION_CONTEXT_COOKIE } from '@/lib/tenant/activeTenant'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const slug = String((await request.formData()).get('domainSlug') ?? '')
  if (!user || !slug) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 1, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return NextResponse.redirect(new URL('/', request.url), 303)
  const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domain.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  const ownerId = typeof domain.ownerUser === 'object' ? domain.ownerUser?.id : domain.ownerUser
  if (String(ownerId) !== String(user.id) && admins.docs.length === 0) return NextResponse.redirect(new URL('/', request.url), 303)
  const response = NextResponse.redirect(new URL(`/domain/${slug}`, request.url), 303)
  response.cookies.set(ACTIVE_TENANT_COOKIE, slug, { httpOnly: true, sameSite: 'lax', path: '/' })
  response.cookies.delete(ACTIVE_CHARACTER_COOKIE)
  response.cookies.set(ADMINISTRATION_CONTEXT_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/' })
  return response
}

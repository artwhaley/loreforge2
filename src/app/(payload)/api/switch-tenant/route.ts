import { NextResponse } from 'next/server'
import { cookies } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@payload-config'

import { ACTIVE_CHARACTER_COOKIE, ACTIVE_TENANT_COOKIE } from '@/lib/tenant/activeTenant'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })

  const formData = await request.formData()
  const slug = String(formData.get('tenantSlug') ?? '')
  const cookieStore = await cookies()
  const activeCharacterId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value

  if (user && slug) {
    // Validate membership before accepting the switch.
    const tenants = await payload.find({
      collection: 'domains',
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
    })
    const tenant = tenants.docs[0]
    if (tenant) {
      const memberships = activeCharacterId ? await payload.find({
        collection: 'domain-memberships',
        where: {
          and: [
            { character: { equals: activeCharacterId } },
            { or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] },
            { status: { equals: 'active' } },
          ],
        },
        depth: 0,
        limit: 1,
      }) : { docs: [] }
      const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: tenant.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
      const ownerId = typeof tenant.ownerUser === 'object' ? tenant.ownerUser?.id : tenant.ownerUser
      const isAdmin = Boolean(user.isPlatformAdmin) || String(ownerId) === String(user.id) || admins.docs.length > 0
      if (memberships.docs.length > 0 || isAdmin) {
        const res = NextResponse.redirect(new URL(`/domain/${slug}`, request.url), 303)
        res.cookies.set(ACTIVE_TENANT_COOKIE, slug, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
        // P07X-T02: keep the acting identity whenever it is valid in the
        // destination Domain (active member Character; platform_admin anywhere;
        // the domain_admin of exactly that Domain). A "managed-only" selection
        // with no usable identity still clears it.
        if (activeCharacterId) {
          const characterId = Number(activeCharacterId)
          const { isIdentityValidInDomain } = await import('@/lib/characters/identitySelect')
          const accountRow = await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true }).catch(() => null) as { isPlatformAdmin?: unknown } | null
          const valid = Number.isFinite(characterId)
            ? await isIdentityValidInDomain(payload, { userId: user.id, characterId, domainId: tenant.id, userIsPlatformAdmin: Boolean(accountRow?.isPlatformAdmin) })
            : false
          if (!valid) res.cookies.delete(ACTIVE_CHARACTER_COOKIE)
        }
        return res
      }
    }
  }

  // Fall back to home if the switch was invalid.
  return NextResponse.redirect(new URL('/', request.url), 303)
}

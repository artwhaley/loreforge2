import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { ACTIVE_TENANT_COOKIE } from '@/lib/tenant/activeTenant'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })

  const formData = await request.formData()
  const slug = String(formData.get('tenantSlug') ?? '')

  if (user && slug) {
    // Validate membership before accepting the switch.
    const tenants = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
    })
    const tenant = tenants.docs[0]
    if (tenant) {
      const memberships = await payload.find({
        collection: 'memberships',
        where: {
          and: [{ user: { equals: user.id } }, { tenant: { equals: tenant.id } }],
        },
        depth: 0,
        limit: 1,
      })
      if (memberships.docs.length > 0) {
        const res = NextResponse.redirect(new URL(`/tenant/${slug}`, request.url), 303)
        res.cookies.set(ACTIVE_TENANT_COOKIE, slug, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
        return res
      }
    }
  }

  // Fall back to home if the switch was invalid.
  return NextResponse.redirect(new URL('/', request.url), 303)
}

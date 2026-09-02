import { cookies } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Tenant } from '@/payload-types'

export const ACTIVE_TENANT_COOKIE = 'sl-civic-active-tenant'

/**
 * Active tenant resolution for the MVP.
 *
 * The tenant switcher writes this cookie; server components read it here.
 * A future hostname/custom-domain resolver can replace this single function
 * without changing the content model or any calling components.
 *
 * Always validates that the current user is a member of the tenant, so an
 * arbitrary cookie value cannot expose another city's content.
 */
export async function getActiveTenant(): Promise<{
  tenant: Tenant | null
  role: 'admin' | 'member' | null
  user: { id: number; name?: string; email?: string } | null
}> {
  const payload = await getPayload({ config })
  const headers = await import('next/headers.js').then((m) => m.headers())
  const { user } = await payload.auth({ headers })

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value

  if (!cookieValue) {
    return { tenant: null, role: null, user: null }
  }

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: cookieValue } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    return { tenant: null, role: null, user: null }
  }

  // Membership check: only members/admins of this tenant may activate it.
  const memberships = await payload.find({
    collection: 'memberships',
    where: {
      and: [{ user: { equals: user?.id ?? -1 } }, { tenant: { equals: tenant.id } }],
    },
    depth: 0,
    limit: 1,
  })
  const membership = memberships.docs[0]
  if (!membership) {
    return { tenant: null, role: null, user: null }
  }

  return {
    tenant,
    role: membership.role as 'admin' | 'member',
    user: user ? { id: Number(user.id), name: user.name, email: user.email } : null,
  }
}

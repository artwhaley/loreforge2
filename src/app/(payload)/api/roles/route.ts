import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { assertRoleHierarchy } from '@/lib/roles/invariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const name = String(form.get('name') ?? '').trim()
  const parentRoleId = idOf(form.get('parentRoleId'))
  const subdomainId = idOf(form.get('subdomainId'))
  if (!user || !domainSlug || !name) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return NextResponse.redirect(new URL('/', request.url), 303)
  if (await authorizeInterimOperation(payload, { userId: user.id }, domain.id) !== true) return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  const roles = await payload.find({ collection: 'roles', where: { domain: { equals: domain.id } }, depth: 0, limit: 500 })
  const parent = parentRoleId ? roles.docs.find((role) => Number(role.id) === parentRoleId) : null
  if (parentRoleId && !parent) return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  if (subdomainId) {
    const subdomain = await payload.findByID({ collection: 'subdomains', id: subdomainId, depth: 0 }).catch(() => null)
    if (!subdomain || idOf(subdomain.domain) !== Number(domain.id)) return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  }
  try {
    assertRoleHierarchy(
      { id: 'new', domainId: domain.id, subdomainId, parentRoleId },
      parent ? { id: parent.id, domainId: idOf(parent.domain) ?? domain.id, subdomainId: idOf(parent.subdomain), parentRoleId: idOf(parent.parentRole) } : null,
      roles.docs.map((role) => ({ id: role.id, domainId: idOf(role.domain) ?? domain.id, subdomainId: idOf(role.subdomain), parentRoleId: idOf(role.parentRole) })),
    )
    const created = await payload.create({ collection: 'roles', data: { domain: domain.id, subdomain: subdomainId, name, parentRole: parentRoleId, active: true, system: false } })
    payload.logger.info(`Phase 3 role created: actorUser=${user.id} operation=create_role resource=${created.id}`)
  } catch {
    // Keep the customer on the role manager with no schema/error details leaked.
  }
  return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
}

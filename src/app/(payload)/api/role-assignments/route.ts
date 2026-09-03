import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { assertRoleAssignment } from '@/lib/roles/invariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const characterId = Number(form.get('characterId') ?? '')
  const roleId = Number(form.get('roleId') ?? '')
  const action = String(form.get('action') ?? 'add')
  const destination = `/domain/${domainSlug}/manage/people/${characterId}`
  if (!user || !domainSlug || !Number.isFinite(characterId) || !Number.isFinite(roleId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain || await authorizeInterimOperation(payload, { userId: user.id }, domain.id) !== true) return NextResponse.redirect(new URL(destination, request.url), 303)
  const role = await payload.findByID({ collection: 'roles', id: roleId, depth: 0 }).catch(() => null)
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 }).catch(() => null)
  if (!role || !character || idOf(role.domain) !== Number(domain.id) || !idOf(role.subdomain) || character.status !== 'active') return NextResponse.redirect(new URL(destination, request.url), 303)
  const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: character.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  if (!membership.docs[0]) return NextResponse.redirect(new URL(destination, request.url), 303)
  try {
    assertRoleAssignment(
      { characterId, roleId },
      { id: role.id, domainId: idOf(role.domain) ?? domain.id, subdomainId: idOf(role.subdomain), parentRoleId: idOf(role.parentRole) },
    )
    const existing = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: character.id } }, { role: { equals: role.id } }] }, depth: 0, limit: 1 })
    if (action === 'remove') {
      if (existing.docs[0]) await payload.delete({ collection: 'role-assignments', id: existing.docs[0].id })
    } else if (!existing.docs[0]) {
      await payload.create({ collection: 'role-assignments', data: { character: character.id, role: role.id, status: 'active', assignedBy: user.id } })
    }
    payload.logger.info(`P05-T00 audit: ${action === 'remove' ? 'removed' : 'assigned'} Role=${role.id} Character=${character.id} Domain=${domain.id} actorUser=${user.id}`)
  } catch {
    // Invalid roles are intentionally not disclosed through the customer redirect.
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

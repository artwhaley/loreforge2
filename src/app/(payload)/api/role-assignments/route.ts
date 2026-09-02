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
  if (!user || !domainSlug || !Number.isFinite(characterId) || !Number.isFinite(roleId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain || await authorizeInterimOperation(payload, { userId: user.id }, domain.id) !== true) return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  const role = await payload.findByID({ collection: 'roles', id: roleId, depth: 0 }).catch(() => null)
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 }).catch(() => null)
  if (!role || !character || idOf(role.domain) !== Number(domain.id) || character.status !== 'active') return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: character.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  if (!membership.docs[0]) return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  const multiScopeMode = form.get('scopeInputMode') === 'multi'
  const submittedScopeValues = multiScopeMode ? form.getAll('scopeFolderIds') : form.getAll('scopeFolderId')
  const scopeFolderIds = submittedScopeValues.length === 0 && !multiScopeMode
    ? [null]
    : submittedScopeValues.map((value) => idOf(value)).filter((value, index, values): value is number | null => value === null || (value !== null && Number.isFinite(value) && values.indexOf(value) === index))
  const domainWide = form.get('domainWide') === '1'
  const requestedScopes = domainWide && !scopeFolderIds.includes(null) ? [null, ...scopeFolderIds] : scopeFolderIds
  if (requestedScopes.length === 0) return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
  try {
    for (const scopeFolderId of requestedScopes) {
      const folder = scopeFolderId ? await payload.findByID({ collection: 'folders', id: scopeFolderId, depth: 0 }).catch(() => null) : null
      if (scopeFolderId && !folder) continue
      assertRoleAssignment(
        { characterId, roleId, scopeFolderId },
        { id: role.id, domainId: idOf(role.domain) ?? domain.id, subdomainId: idOf(role.subdomain), parentRoleId: idOf(role.parentRole) },
        folder ? { id: folder.id, domainId: idOf(folder.domain) ?? idOf(folder.tenant) ?? domain.id, subdomainId: idOf(folder.subdomain), parentId: idOf(folder.parent) } : null,
      )
      const existing = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: character.id } }, { role: { equals: role.id } }, scopeFolderId ? { scopeFolder: { equals: scopeFolderId } } : { scopeFolder: { equals: null } }] }, depth: 0, limit: 1 })
      if (existing.docs[0]) await payload.update({ collection: 'role-assignments', id: existing.docs[0].id, data: { status: action === 'remove' ? 'inactive' : 'active', assignedBy: user.id } })
      else if (action !== 'remove') await payload.create({ collection: 'role-assignments', data: { character: character.id, role: role.id, scopeFolder: scopeFolderId, status: 'active', assignedBy: user.id } })
    }
    payload.logger.info(`Phase 3 role assignment: actorUser=${user.id} operation=${action}_role_assignment character=${character.id} role=${role.id}`)
  } catch {
    // Invalid scope or hierarchy is intentionally a no-op from the customer surface.
  }
  return NextResponse.redirect(new URL(`/domain/${domainSlug}/roles`, request.url), 303)
}

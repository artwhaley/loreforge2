import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { canAssignRole } from '@/lib/authz/delegation'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { recordDomainAudit } from '@/lib/domains/domainAudit'
import { assertRoleAssignment } from '@/lib/roles/invariants'
import { runInTransaction } from '@/lib/db/transactions'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const characterIds = [...new Set(form.getAll('characterId').map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
  const characterId = characterIds[0] ?? 0
  const roleId = Number(form.get('roleId') ?? '')
  const action = String(form.get('action') ?? 'add')
  const requestedReturnTo = String(form.get('returnTo') ?? '')
  const destination = requestedReturnTo.startsWith(`/domain/${domainSlug}/`) ? requestedReturnTo : `/domain/${domainSlug}/manage/people/${characterId}`
  if (!user || !domainSlug || characterIds.length === 0 || !Number.isFinite(roleId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  const active = await getActiveContext().catch(() => ({ tenant: null, activeCharacter: null }))
  const activeCharacterId = active.tenant?.slug === domainSlug ? active.activeCharacter?.id ?? null : null
  if (!domain || !(await canAssignRole(payload, { actor: { userId: user.id, activeCharacterId }, domainId: domain.id, targetRoleId: roleId }))) return NextResponse.redirect(new URL(destination, request.url), 303)
  const role = await payload.findByID({ collection: 'roles', id: roleId, depth: 0 }).catch(() => null)
  if (!role || idOf(role.domain) !== Number(domain.id) || !idOf(role.subdomain) || role.active === false) return NextResponse.redirect(new URL(destination, request.url), 303)
  try {
    await runInTransaction(payload, async (transactionID) => {
      const req = { transactionID }
    for (const selectedCharacterId of characterIds) {
      const character = await payload.findByID({ collection: 'characters', id: selectedCharacterId, depth: 0, req }).catch(() => null)
      if (!character || character.status !== 'active') continue
      const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: character.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, req })
      if (!membership.docs[0]) continue
      assertRoleAssignment(
        { characterId: selectedCharacterId, roleId },
        { id: role.id, domainId: idOf(role.domain) ?? domain.id, subdomainId: idOf(role.subdomain), parentRoleId: idOf(role.parentRole) },
      )
      const existing = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: character.id } }, { role: { equals: role.id } }] }, depth: 0, limit: 1, req })
      // P05R-T05 C: assignments/removals are durable administrative truth.
      if (action === 'remove') {
        if (existing.docs[0]) {
          await payload.delete({ collection: 'role-assignments', id: existing.docs[0].id, req })
          await recordDomainAudit({
            payload, domainId: domain.id, eventType: 'role_assignment_changed', actorUser: user.id,
            targetType: 'role-assignment', targetId: existing.docs[0].id,
            action: 'removed', context: { roleId: role.id, characterId: character.id, roleName: role.name },
            transactionID,
          })
        }
      } else if (!existing.docs[0]) {
        const created = await payload.create({ collection: 'role-assignments', req, data: { character: character.id, role: role.id, status: 'active', assignedBy: user.id } })
        await recordDomainAudit({
          payload, domainId: domain.id, eventType: 'role_assignment_changed', actorUser: user.id,
          targetType: 'role-assignment', targetId: created.id,
          action: 'assigned', context: { roleId: role.id, characterId: character.id, roleName: role.name },
          transactionID,
        })
      }
      payload.logger.info(`P05-T00 audit: ${action === 'remove' ? 'removed' : 'assigned'} Role=${role.id} Character=${character.id} Domain=${domain.id} actorUser=${user.id}`)
    }
    })
  } catch (error) {
    payload.logger.error(error)
    const failed = new URL(destination, request.url)
    failed.searchParams.set('error', 'mutation')
    return NextResponse.redirect(failed, 303)
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

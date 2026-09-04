import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { assertCanCreateRole } from '@/lib/authz/delegation'
import { recordDomainAudit } from '@/lib/domains/domainAudit'
import { assertRoleHierarchy } from '@/lib/roles/invariants'
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
  const action = String(form.get('action') ?? 'create')
  const requestedReturnTo = String(form.get('returnTo') ?? '')
  const fallback = `/domain/${domainSlug}/roles`
  const destination = requestedReturnTo.startsWith(`/domain/${domainSlug}/`) ? requestedReturnTo : fallback
  if (!user || !domainSlug) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return NextResponse.redirect(new URL('/', request.url), 303)
  if (action === 'delete') {
    const roleId = Number(form.get('roleId') ?? '')
    if (!Number.isFinite(roleId)) return NextResponse.redirect(new URL(destination, request.url), 303)
    const role = await payload.findByID({ collection: 'roles', id: roleId, depth: 0 }).catch(() => null)
    if (!role || idOf(role.domain) !== Number(domain.id) || role.system) return NextResponse.redirect(new URL(destination, request.url), 303)
    try { await assertCanCreateRole(payload, { actor: { userId: user.id }, domainId: domain.id, departmentId: idOf(role.subdomain) ?? 0 }) } catch { return NextResponse.redirect(new URL(destination, request.url), 303) }
    const children = await payload.find({ collection: 'roles', where: { and: [{ parentRole: { equals: roleId } }, { active: { equals: true } }] }, depth: 0, limit: 1 })
    if (children.docs.length > 0) return NextResponse.redirect(new URL(destination, request.url), 303)
    try {
      await runInTransaction(payload, async (transactionID) => {
        const req = { transactionID }
        await payload.update({ collection: 'roles', id: roleId, data: { active: false }, req })
        const assignments = await payload.find({ collection: 'role-assignments', where: { and: [{ role: { equals: roleId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 5000, req })
        for (const assignment of assignments.docs) await payload.update({ collection: 'role-assignments', id: assignment.id, data: { status: 'inactive' }, req })
        payload.logger.info(`Phase 5 role archived: actorUser=${user.id} operation=delete_role resource=${roleId}`)
        await recordDomainAudit({
          payload, domainId: domain.id, eventType: 'role_changed', actorUser: user.id,
          targetType: 'role', targetId: roleId,
          action: 'archived',
          context: { name: role.name, active: false, deactivatedAssignmentCount: assignments.docs.length },
          transactionID,
        })
      })
    } catch (error) {
      payload.logger.error(error)
      const failed = new URL(destination, request.url)
      failed.searchParams.set('error', 'mutation')
      return NextResponse.redirect(failed, 303)
    }
    return NextResponse.redirect(new URL(destination, request.url), 303)
  }
  const name = String(form.get('name') ?? '').trim()
  const parentRoleId = idOf(form.get('parentRoleId'))
  const subdomainId = idOf(form.get('subdomainId'))
  if (!name || !subdomainId) return NextResponse.redirect(new URL(destination, request.url), 303)
  const roles = await payload.find({ collection: 'roles', where: { domain: { equals: domain.id } }, depth: 0, limit: 500 })
  const parent = parentRoleId ? roles.docs.find((role) => Number(role.id) === parentRoleId) : null
  if (parentRoleId && !parent) return NextResponse.redirect(new URL(destination, request.url), 303)
  if (subdomainId) {
    const subdomain = await payload.findByID({ collection: 'subdomains', id: subdomainId, depth: 0 }).catch(() => null)
    if (!subdomain || idOf(subdomain.domain) !== Number(domain.id)) return NextResponse.redirect(new URL(destination, request.url), 303)
  }
  try { await assertCanCreateRole(payload, { actor: { userId: user.id }, domainId: domain.id, departmentId: subdomainId }) } catch { return NextResponse.redirect(new URL(destination, request.url), 303) }
  try {
    assertRoleHierarchy(
      { id: 'new', domainId: domain.id, subdomainId, parentRoleId },
      parent ? { id: parent.id, domainId: idOf(parent.domain) ?? domain.id, subdomainId: idOf(parent.subdomain), parentRoleId: idOf(parent.parentRole) } : null,
      roles.docs.map((role) => ({ id: role.id, domainId: idOf(role.domain) ?? domain.id, subdomainId: idOf(role.subdomain), parentRoleId: idOf(role.parentRole) })),
    )
    await runInTransaction(payload, async (transactionID) => {
      const created = await payload.create({ collection: 'roles', req: { transactionID }, data: { domain: domain.id, subdomain: subdomainId, name, parentRole: parentRoleId, active: true, system: false } })
      payload.logger.info(`Phase 3 role created: actorUser=${user.id} operation=create_role resource=${created.id}`)
      await recordDomainAudit({
        payload, domainId: domain.id, eventType: 'role_changed', actorUser: user.id,
        targetType: 'role', targetId: created.id,
        action: 'created',
        context: { name, subdomainId, parentRoleId },
        transactionID,
      })
    })
  } catch (error) {
    payload.logger.error(error)
    const failed = new URL(destination, request.url)
    failed.searchParams.set('error', 'mutation')
    return NextResponse.redirect(failed, 303)
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

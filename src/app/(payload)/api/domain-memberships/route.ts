import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { recordDomainAudit } from '@/lib/domains/domainAudit'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const characterId = Number(form.get('characterId') ?? '')
  const action = String(form.get('action') ?? 'add')
  if (!user || !domainSlug || !Number.isFinite(characterId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return NextResponse.redirect(new URL('/', request.url), 303)
  const allowed = await authorizeInterimOperation(payload, { userId: user.id }, domain.id)
  if (allowed !== true) return NextResponse.redirect(new URL(`/domain/${domainSlug}/members`, request.url), 303)
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 })
  if (!character || character.status !== 'active') return NextResponse.redirect(new URL(`/domain/${domainSlug}/members`, request.url), 303)
  const existing = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: character.id } }] }, depth: 0, limit: 1 })
  // P05R-T05 C: additions/reinstatements are audited here; REMOVALS are
  // audited inside the transactional deactivation cascade (the afterChange
  // hook), so a removal leaves exactly one coherent audit event that commits
  // atomically with the state change. addedBy on the update keeps the actor
  // visible to the removal hook.
  if (existing.docs[0]) {
    const priorStatus = String(existing.docs[0].status ?? 'active')
    await payload.update({ collection: 'domain-memberships', id: existing.docs[0].id, data: { domain: domain.id, status: action === 'remove' ? 'inactive' : 'active', addedBy: user.id } })
    if (action !== 'remove') {
      await recordDomainAudit({
        payload, domainId: domain.id, eventType: 'membership_changed', actorUser: user.id,
        targetType: 'domain-membership', targetId: existing.docs[0].id,
        action: priorStatus === 'active' ? 'added' : 'reinstated',
        context: { characterId: character.id, priorStatus },
      }).catch((error: Error) => payload.logger.error(`domain audit write failed: ${error.message}`))
    }
  } else if (action !== 'remove') {
    const created = await payload.create({ collection: 'domain-memberships', data: { domain: domain.id, character: character.id, status: 'active', addedBy: user.id, note: 'Added through the Domain member roster.' } })
    await recordDomainAudit({
      payload, domainId: domain.id, eventType: 'membership_changed', actorUser: user.id,
      targetType: 'domain-membership', targetId: created.id,
      action: 'added', context: { characterId: character.id },
    }).catch((error: Error) => payload.logger.error(`domain audit write failed: ${error.message}`))
  }
  return NextResponse.redirect(new URL(`/domain/${domainSlug}/members`, request.url), 303)
}

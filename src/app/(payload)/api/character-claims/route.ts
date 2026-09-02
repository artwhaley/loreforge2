import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { applyClaimDecision } from '@/lib/characters/claims'
import { getActiveContext, getActiveTenant } from '@/lib/tenant/activeTenant'

const relationId = (value: unknown): number =>
  typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const formData = await request.formData()
  const action = String(formData.get('action') ?? '')
  const characterId = Number(formData.get('characterId') ?? '')
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const redirectTo = `/characters/${Number.isFinite(characterId) ? characterId : ''}`

  if (!user || !Number.isFinite(characterId)) {
    return NextResponse.redirect(new URL('/', request.url), 303)
  }

  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 })
  const tenants = await payload.find({ collection: 'tenants', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
  const tenant = tenants.docs[0]
  if (!character || !tenant) return NextResponse.redirect(new URL('/', request.url), 303)

  if (action === 'request') {
    if (character.status !== 'active' || character.controlledBy !== null && character.controlledBy !== undefined) {
      return NextResponse.redirect(new URL(redirectTo, request.url), 303)
    }
    const existing = await payload.find({
      collection: 'character-claim-requests',
      where: {
        and: [
          { character: { equals: character.id } },
          { claimant: { equals: user.id } },
          { tenant: { equals: tenant.id } },
          { status: { equals: 'pending' } },
        ],
      },
      depth: 0,
      limit: 1,
    })
    if (!existing.docs[0]) {
      await payload.create({
        collection: 'character-claim-requests',
        data: {
          character: character.id,
          claimant: user.id,
          tenant: tenant.id,
          status: 'pending',
          requestedAt: new Date().toISOString(),
        },
      })
    }
    return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  }

  if (action === 'decide') {
    const claimId = Number(formData.get('claimId') ?? '')
    const decision = String(formData.get('decision') ?? '')
    if (!Number.isFinite(claimId) || (decision !== 'approved' && decision !== 'rejected')) {
      return NextResponse.redirect(new URL(redirectTo, request.url), 303)
    }
    const claims = await payload.find({
      collection: 'character-claim-requests',
      where: { id: { equals: claimId } },
      depth: 1,
      limit: 1,
    })
    const claim = claims.docs[0]
    if (!claim) return NextResponse.redirect(new URL(redirectTo, request.url), 303)
    const claimTenantId = relationId(claim.tenant)
    const actorMembership = await payload.find({
      collection: 'memberships',
      where: {
        and: [{ user: { equals: user.id } }, { tenant: { equals: claimTenantId } }, { role: { equals: 'admin' } }],
      },
      depth: 0,
      limit: 1,
    })
    const currentCharacter = await payload.findByID({ collection: 'characters', id: relationId(claim.character), depth: 0 })
    const currentController =
      typeof currentCharacter.controlledBy === 'object'
        ? currentCharacter.controlledBy?.id
        : currentCharacter.controlledBy
    const result = applyClaimDecision(
      { status: claim.status, characterControlledBy: currentController },
      decision,
      relationId(claim.claimant),
      { userId: user.id, isLegacyDomainAdmin: actorMembership.docs.length > 0 },
    )
    if (typeof result === 'string') return NextResponse.redirect(new URL(redirectTo, request.url), 303)

    const context = await getActiveContext()
    if (decision === 'approved') {
      await payload.update({
        collection: 'characters',
        id: currentCharacter.id,
        data: { controlledBy: Number(result.characterControlledBy) },
      })
    }
    await payload.update({
      collection: 'character-claim-requests',
      id: claim.id,
      data: {
        status: result.status,
        decidedAt: new Date().toISOString(),
        decidedBy: user.id,
        decidingCharacter: context.activeCharacter?.id,
        decisionNote: String(formData.get('decisionNote') ?? '').trim() || undefined,
      },
    })
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), 303)
}

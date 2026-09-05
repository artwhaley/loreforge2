import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { decideCharacterClaim } from '@/lib/characters/decideClaim'
import { getActiveContext } from '@/lib/tenant/activeTenant'


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
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!character || !domain) return NextResponse.redirect(new URL('/', request.url), 303)

  if (action === 'request') {
    // P07X-T01: administrative Character kinds are system-managed and can
    // never be the target of an ordinary claim.
    if (character.kind === 'domain_admin' || character.kind === 'platform_admin') {
      return NextResponse.redirect(new URL(redirectTo, request.url), 303)
    }
    if (character.status !== 'active' || character.controlledBy !== null && character.controlledBy !== undefined) {
      return NextResponse.redirect(new URL(redirectTo, request.url), 303)
    }
    const existing = await payload.find({
      collection: 'character-claim-requests',
      where: {
        and: [
          { character: { equals: character.id } },
          { claimant: { equals: user.id } },
          { domain: { equals: domain.id } },
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
          domain: domain.id,
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
    const context = await getActiveContext()
    await decideCharacterClaim(payload, {
      actor: { userId: user.id, activeCharacterId: context.tenant?.slug === tenantSlug ? context.activeCharacter?.id : null },
      domainId: domain.id, characterId, claimId, decision,
      note: String(formData.get('decisionNote') ?? '').trim() || undefined,
    })
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), 303)
}

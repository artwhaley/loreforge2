import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { ensureDomainCharacterContext } from '@/lib/characters/localContext'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { isAllowed } from '@/lib/authz/evaluate'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const formData = await request.formData()
  const characterId = Number(formData.get('characterId') ?? '')
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const localDisplayName = String(formData.get('localDisplayName') ?? '').trim()
  const redirectTo = `/characters/${Number.isFinite(characterId) ? characterId : ''}`
  if (!user || !Number.isFinite(characterId) || !localDisplayName) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  }
  const context = await getActiveTenant()
  if (!context.tenant || context.tenant.slug !== tenantSlug) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  }
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: context.activeCharacter?.id }, domainId: context.tenant.id, capability: 'manage_members', resource: { type: 'Domain', id: context.tenant.id } })) return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  const existing = await payload.find({
    collection: 'domain-character-contexts',
    where: {
      and: [{ or: [{ domain: { equals: context.tenant.id } }, { tenant: { equals: context.tenant.id } }] }, { character: { equals: characterId } }],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    await payload.update({
      collection: 'domain-character-contexts',
      id: existing.docs[0].id,
      data: { localDisplayName, localNote: String(formData.get('localNote') ?? '').trim() || undefined },
    })
  } else {
    const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0 })
    await ensureDomainCharacterContext(payload, context.tenant.id, character.id, localDisplayName || character.name)
    if (String(formData.get('localNote') ?? '').trim()) {
      const created = await payload.find({
        collection: 'domain-character-contexts',
        where: {
          and: [{ or: [{ domain: { equals: context.tenant.id } }, { tenant: { equals: context.tenant.id } }] }, { character: { equals: characterId } }],
        },
        depth: 0,
        limit: 1,
      })
      if (created.docs[0]) {
        await payload.update({
          collection: 'domain-character-contexts',
          id: created.docs[0].id,
          data: { localNote: String(formData.get('localNote')).trim() },
        })
      }
    }
  }
  return NextResponse.redirect(new URL(redirectTo, request.url), 303)
}

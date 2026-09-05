import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { isAdminKind } from '@/lib/characters/kinds'

const NAME_LIMIT = 160

type CharacterRow = {
  id: number
  kind?: string
  controlledBy?: unknown
}

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const back = (params: Record<string, string>) => {
    const url = new URL('/account/characters', request.url)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    return NextResponse.redirect(url, 303)
  }
  if (!user) return back({ error: 'login' })
  const form = await request.formData()
  const action = String(form.get('action') ?? '')

  if (action === 'create') {
    const name = String(form.get('name') ?? '').trim()
    if (!name || name.length > NAME_LIMIT) return back({ error: 'name' })
    try {
      // The Characters collection is closed to direct writes; customer-facing
      // creation goes through overrideAccess with the full beforeChange hook
      // still enforcing the character-kind invariants.
      await payload.create({
        collection: 'characters',
        overrideAccess: true,
        data: { name, kind: 'player', status: 'active', controlledBy: user.id, createdBy: user.id },
      })
    } catch (error) {
      payload.logger?.error?.(error)
      return back({ error: 'create' })
    }
    return back({ created: '1' })
  }

  if (action === 'delete') {
    const characterId = Number(form.get('characterId') ?? '')
    if (!Number.isFinite(characterId)) return back({ error: 'id' })
    const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true }).catch(() => null) as CharacterRow | null
    if (!character) return back({ error: 'missing' })
    // This page only manages Characters the current account controls; the
    // dashboard also exposes system-provisioned admin identities, which must
    // never be deleted from a customer surface.
    if (relationId(character.controlledBy) !== Number(user.id)) return back({ error: 'owner' })
    if (isAdminKind(String(character.kind ?? 'player'))) return back({ error: 'admin' })
    // Character references are NOT NULL on their child rows with `ON DELETE
    // set null`; deleting a referenced Character would violate the columns.
    // Refuse deletion while any membership, role assignment, context, link,
    // claim, or merge request still points at it.
    const [memberships, assignments, contexts, links, claims, merges] = await Promise.all([
      payload.find({ collection: 'domain-memberships', where: { character: { equals: characterId } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: 'role-assignments', where: { character: { equals: characterId } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: 'domain-character-contexts', where: { character: { equals: characterId } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: 'document-character-links', where: { character: { equals: characterId } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: 'character-claim-requests', where: { character: { equals: characterId } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: 'character-merge-requests', where: { or: [{ source: { equals: characterId } }, { target: { equals: characterId } }] }, depth: 0, limit: 1, overrideAccess: true }),
    ])
    if (memberships.docs.length || assignments.docs.length || contexts.docs.length || links.docs.length || claims.docs.length || merges.docs.length) {
      return back({ error: 'in-use' })
    }
    try {
      await payload.delete({ collection: 'characters', id: characterId, overrideAccess: true })
    } catch (error) {
      payload.logger?.error?.(error)
      return back({ error: 'delete' })
    }
    return back({ deleted: '1' })
  }

  return back({ error: 'action' })
}
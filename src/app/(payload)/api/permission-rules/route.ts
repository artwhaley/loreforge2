import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { authorizeInterimOperation } from '@/lib/authorization/interim'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return idOf((value as { value: unknown }).value)
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const characterId = Number(form.get('characterId') ?? '')
  const folderId = Number(form.get('folderId') ?? '')
  const readState = String(form.get('readState') ?? 'inherit')
  const writeState = String(form.get('writeState') ?? 'inherit')
  const destination = `/domain/${domainSlug}/manage/people/${characterId}#folder-access`
  if (!user || !domainSlug || !Number.isFinite(characterId) || !Number.isFinite(folderId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain || await authorizeInterimOperation(payload, { userId: user.id }, domain.id) !== true) return NextResponse.redirect(new URL(destination, request.url), 303)
  const [character, folder, membership] = await Promise.all([
    payload.findByID({ collection: 'characters', id: characterId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'folders', id: folderId, depth: 0 }).catch(() => null),
    payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 }),
  ])
  if (!character || character.status !== 'active' || !folder || idOf(folder.domain) !== Number(domain.id) || !membership.docs[0]) return NextResponse.redirect(new URL(destination, request.url), 303)
  const existing = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domain.id } }, { principalType: { equals: 'Character' } }] }, depth: 0, limit: 5000 }).catch(() => ({ docs: [] }))
  const directRules = existing.docs.filter((rule) => idOf(rule.principal) === characterId && rule.resourceType === 'Folder' && idOf(rule.resource) === folderId)
  const removeCapabilities = async (capabilities: string[]) => {
    for (const rule of directRules.filter((item) => capabilities.includes(item.capability))) await payload.delete({ collection: 'permission-rules', id: rule.id })
  }
  const saveAxis = async (state: string, capabilities: string[]) => {
    if (!['inherit', 'grant', 'deny'].includes(state)) return
    await removeCapabilities(capabilities)
    if (state === 'inherit') return
    for (const capability of capabilities) {
      await payload.create({ collection: 'permission-rules', data: { domain: domain.id, principalType: 'Character', principal: { relationTo: 'characters', value: character.id }, resourceType: 'Folder', resource: { relationTo: 'folders', value: folder.id }, capability: capability as 'read' | 'create_document' | 'edit_document', effect: state as 'grant' | 'deny', active: true, actorUser: user.id, actorCharacter: undefined } })
    }
  }
  await saveAxis(readState, ['read'])
  await saveAxis(writeState, ['create_document', 'edit_document'])
  payload.logger.info(`P05-T00 audit: saved direct Folder Read/Write overrides domain=${domain.id} character=${character.id} folder=${folder.id} actorUser=${user.id}`)
  return NextResponse.redirect(new URL(destination, request.url), 303)
}

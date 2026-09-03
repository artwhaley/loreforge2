import type { Payload } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { recordDocumentProvenance } from '@/lib/documents/provenance'
import { normalizeTagName } from '@/lib/documents/linkInvariants'

export type CharacterLinkKind = 'prepared_by' | 'concerns'
export type LinkActor = { userId: number | string; characterId?: number | string | null }

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

async function requireDomainAdmin(payload: Payload, actor: LinkActor, domainId: number | string) {
  const result = await authorizeInterimOperation(payload, { userId: actor.userId, activeCharacterId: actor.characterId }, domainId)
  if (result !== true) throw new Error(result)
}

async function documentInDomain(payload: Payload, documentId: number | string, domainId: number | string) {
  const document = await payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true })
  if (!document || idOf(document.domain) !== Number(domainId)) throw new Error('Document does not belong to this Domain.')
  return document
}

export async function getDocumentCharacterLinks(payload: Payload, documentId: number | string) {
  return payload.find({ collection: 'document-character-links', where: { document: { equals: documentId } }, depth: 1, limit: 500, overrideAccess: true })
}

export async function getDocumentTags(payload: Payload, documentId: number | string) {
  return payload.find({ collection: 'document-tags', where: { document: { equals: documentId } }, depth: 1, limit: 500, overrideAccess: true })
}

/** Attach a typed visible Character link and append its provenance event. */
export async function attachDocumentCharacterLink(args: {
  payload: Payload
  domainId: number | string
  documentId: number | string
  characterId: number | string
  kind: CharacterLinkKind
  relationshipLabel?: string | null
  actor: LinkActor
  requiredByCreate?: boolean
  skipAuthorization?: boolean
}) {
  const { payload, domainId, documentId, characterId, kind, actor } = args
  const document = await documentInDomain(payload, documentId, domainId)
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true })
  if (!character || character.status !== 'active') throw new Error('Only active Characters may be linked.')
  if (!args.skipAuthorization) await requireDomainAdmin(payload, actor, domainId)
  const existing = await payload.find({ collection: 'document-character-links', where: { and: [{ document: { equals: documentId } }, { character: { equals: characterId } }, { kind: { equals: kind } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0]
  const created = await payload.create({ collection: 'document-character-links', overrideAccess: true, data: { domain: Number(domainId), document: Number(document.id), character: Number(character.id), kind, relationshipLabel: kind === 'concerns' ? String(args.relationshipLabel ?? '').trim() || undefined : undefined, requiredByCreate: Boolean(args.requiredByCreate), actorUser: Number(actor.userId), actorCharacter: actor.characterId == null ? undefined : Number(actor.characterId) } })
  await recordDocumentProvenance({ payload, domainId, documentId, eventType: 'character_link_changed', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { action: 'attached', kind, characterId: Number(characterId), relationshipLabel: kind === 'concerns' ? String(args.relationshipLabel ?? '').trim() || null : null } })
  return created
}

/** Detach a link, preserving the document and its history. */
export async function detachDocumentCharacterLink(args: { payload: Payload; domainId: number | string; documentId: number | string; characterId: number | string; kind: CharacterLinkKind; actor: LinkActor; skipAuthorization?: boolean }) {
  const { payload, domainId, documentId, characterId, kind, actor } = args
  await documentInDomain(payload, documentId, domainId)
  if (!args.skipAuthorization) await requireDomainAdmin(payload, actor, domainId)
  const existing = await payload.find({ collection: 'document-character-links', where: { and: [{ document: { equals: documentId } }, { character: { equals: characterId } }, { kind: { equals: kind } }] }, depth: 0, limit: 20, overrideAccess: true })
  for (const link of existing.docs) {
    if (link.requiredByCreate) throw new Error('The required Prepared by credit cannot be removed.')
    await payload.delete({ collection: 'document-character-links', id: link.id, overrideAccess: true })
  }
  if (existing.docs.length) await recordDocumentProvenance({ payload, domainId, documentId, eventType: 'character_link_changed', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { action: 'detached', kind, characterId: Number(characterId) } })
}

export async function ensurePreparedBy(args: { payload: Payload; domainId: number | string; documentId: number | string; characterId: number | string; actor: LinkActor; skipAuthorization?: boolean }) {
  const membership = await args.payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: args.domainId } }, { character: { equals: args.characterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (!membership.docs[0]) throw new Error('The Prepared by Character must be an active Domain member.')
  return attachDocumentCharacterLink({ ...args, kind: 'prepared_by', requiredByCreate: true, skipAuthorization: args.skipAuthorization ?? true })
}

/** Find or create a case-insensitive Domain Tag, retaining first display casing. */
export async function findOrCreateDomainTag(args: { payload: Payload; domainId: number | string; name: string; actor: LinkActor; skipAuthorization?: boolean }) {
  const name = args.name.trim()
  if (!name) throw new Error('Tag names cannot be blank.')
  if (!args.skipAuthorization) await requireDomainAdmin(args.payload, args.actor, args.domainId)
  const normalizedName = normalizeTagName(name)
  const existing = await args.payload.find({ collection: 'tags', where: { and: [{ domain: { equals: args.domainId } }, { normalizedName: { equals: normalizedName } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0]
  return args.payload.create({ collection: 'tags', overrideAccess: true, data: { domain: Number(args.domainId), name, normalizedName } })
}

export async function attachDocumentTag(args: { payload: Payload; domainId: number | string; documentId: number | string; tagId: number | string; actor: LinkActor; skipAuthorization?: boolean }) {
  const { payload, domainId, documentId, tagId, actor } = args
  await documentInDomain(payload, documentId, domainId)
  if (!args.skipAuthorization) await requireDomainAdmin(payload, actor, domainId)
  const tag = await payload.findByID({ collection: 'tags', id: tagId, depth: 0, overrideAccess: true })
  if (!tag || idOf(tag.domain) !== Number(domainId)) throw new Error('Tag does not belong to this Domain.')
  const existing = await payload.find({ collection: 'document-tags', where: { and: [{ document: { equals: documentId } }, { tag: { equals: tagId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0]
  const created = await payload.create({ collection: 'document-tags', overrideAccess: true, data: { domain: Number(domainId), document: Number(documentId), tag: Number(tagId), actorUser: Number(actor.userId), actorCharacter: actor.characterId == null ? undefined : Number(actor.characterId) } })
  await recordDocumentProvenance({ payload, domainId, documentId, eventType: 'tag_changed', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { action: 'attached', tagId: Number(tagId), tagName: tag.name } })
  return created
}

export async function detachDocumentTag(args: { payload: Payload; domainId: number | string; documentId: number | string; tagId: number | string; actor: LinkActor; skipAuthorization?: boolean }) {
  const { payload, domainId, documentId, tagId, actor } = args
  await documentInDomain(payload, documentId, domainId)
  if (!args.skipAuthorization) await requireDomainAdmin(payload, actor, domainId)
  const existing = await payload.find({ collection: 'document-tags', where: { and: [{ document: { equals: documentId } }, { tag: { equals: tagId } }] }, depth: 0, limit: 20, overrideAccess: true })
  for (const link of existing.docs) await payload.delete({ collection: 'document-tags', id: link.id, overrideAccess: true })
  if (existing.docs.length) await recordDocumentProvenance({ payload, domainId, documentId, eventType: 'tag_changed', actorUserId: actor.userId, actorCharacterId: actor.characterId, context: { action: 'detached', tagId: Number(tagId) } })
}

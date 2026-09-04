import type { Payload, Where } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { permissionRuleKey } from '@/collections/PermissionRules'

export type SharePrincipalType = 'User' | 'Character'
export type ShareCapability = 'read' | 'edit_document'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

async function getDocument(payload: Payload, domainId: number | string, documentId: number | string) {
  const document = await payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true })
  if (!document || idOf(document.domain) !== Number(domainId)) throw new Error('Document does not belong to this Domain.')
  return document
}

async function requireAdmin(payload: Payload, userId: number | string, domainId: number | string) {
  const result = await authorizeInterimOperation(payload, { userId }, domainId)
  if (result !== true) throw new Error(result)
}

export async function shareDocument(args: { payload: Payload; domainId: number | string; documentId: number | string; principalType: SharePrincipalType; principalId: number | string; capability: ShareCapability; actorUserId: number | string; actorCharacterId?: number | string | null }) {
  const { payload, domainId, documentId, principalType, principalId, capability, actorUserId, actorCharacterId } = args
  const document = await getDocument(payload, domainId, documentId)
  await requireAdmin(payload, actorUserId, domainId)
  if (!['User', 'Character'].includes(principalType) || !['read', 'edit_document'].includes(capability)) throw new Error('Share capability is invalid.')
  if (principalType === 'User') {
    const user = await payload.findByID({ collection: 'users', id: principalId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!user) throw new Error('Share recipient not found.')
  } else {
    const character = await payload.findByID({ collection: 'characters', id: principalId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!character || character.status !== 'active') throw new Error('Share recipient Character is not active.')
    const member = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: principalId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (!member.docs[0]) throw new Error('Share recipient Character is not an active Domain member.')
  }
  const existing = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { principalType: { equals: principalType } }, { resourceType: { equals: 'Document' } }, { resource: { equals: document.id } }, { principal: { equals: principalId } }, { capability: { equals: capability } }] }, depth: 0, limit: 20, overrideAccess: true })
  for (const row of existing.docs) await payload.delete({ collection: 'permission-rules', id: row.id, overrideAccess: true })
  const created = await payload.create({ collection: 'permission-rules', overrideAccess: true, data: { domain: Number(domainId), principalType, principal: { relationTo: principalType === 'User' ? 'users' : 'characters', value: Number(principalId) }, resourceType: 'Document', resource: { relationTo: 'documents', value: Number(document.id) }, capability, effect: 'grant', active: true, actorUser: Number(actorUserId), actorCharacter: actorCharacterId == null ? undefined : Number(actorCharacterId), ruleKey: permissionRuleKey({ domainId: Number(domainId), principalType, principalRelation: principalType === 'User' ? 'users' : 'characters', principalId: Number(principalId), resourceType: 'Document', resourceRelation: 'documents', resourceId: Number(document.id), capability }) }, } as never)
  await recordDocumentProvenance({ payload, domainId, documentId: document.id, eventType: 'shared', actorUserId, actorCharacterId, context: { principalType, principalId: Number(principalId), capability, action: 'granted' }, revisionId: await latestDocumentRevisionId(payload, document.id) })
  return created
}

export async function revokeDocumentShare(args: { payload: Payload; domainId: number | string; documentId: number | string; principalType: SharePrincipalType; principalId: number | string; capability?: ShareCapability; actorUserId: number | string; actorCharacterId?: number | string | null }) {
  const { payload, domainId, documentId, principalType, principalId, actorUserId, actorCharacterId } = args
  const document = await getDocument(payload, domainId, documentId)
  await requireAdmin(payload, actorUserId, domainId)
  const where: Where[] = [{ domain: { equals: domainId } }, { principalType: { equals: principalType } }, { resourceType: { equals: 'Document' } }, { resource: { equals: document.id } }, { principal: { equals: principalId } }]
  if (args.capability) where.push({ capability: { equals: args.capability } })
  const existing = await payload.find({ collection: 'permission-rules', where: { and: where }, depth: 0, limit: 50, overrideAccess: true })
  for (const row of existing.docs) await payload.delete({ collection: 'permission-rules', id: row.id, overrideAccess: true })
  await recordDocumentProvenance({ payload, domainId, documentId: document.id, eventType: 'share_revoked', actorUserId, actorCharacterId, context: { principalType, principalId: Number(principalId), capability: args.capability ?? 'all', removedCount: existing.docs.length }, revisionId: await latestDocumentRevisionId(payload, document.id) })
}

/** Temporary pre-P07 Document-specific read/edit adapter. */
export async function authorizeSharedDocumentAccess(args: { payload: Payload; documentId: number | string; userId: number | string; characterId?: number | string | null; capability: ShareCapability }): Promise<boolean> {
  const document = await args.payload.findByID({ collection: 'documents', id: args.documentId, depth: 0, overrideAccess: true }).catch(() => null)
  const domainId = idOf(document?.domain)
  if (!document || !domainId) return false
  const directUser = await args.payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { principalType: { equals: 'User' } }, { principal: { equals: args.userId } }, { resourceType: { equals: 'Document' } }, { resource: { equals: args.documentId } }, { capability: { equals: args.capability } }, { active: { equals: true } }] }, depth: 0, limit: 20, overrideAccess: true }).catch(() => ({ docs: [] }))
  if (directUser.docs.some((rule) => rule.effect === 'deny')) return false
  if (directUser.docs.some((rule) => rule.effect === 'grant')) return true
  if (args.characterId == null) return false
  const directCharacter = await args.payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { principalType: { equals: 'Character' } }, { principal: { equals: args.characterId } }, { resourceType: { equals: 'Document' } }, { resource: { equals: args.documentId } }, { capability: { equals: args.capability } }, { active: { equals: true } }] }, depth: 0, limit: 20, overrideAccess: true }).catch(() => ({ docs: [] }))
  return directCharacter.docs.some((rule) => rule.effect === 'grant') && !directCharacter.docs.some((rule) => rule.effect === 'deny')
}

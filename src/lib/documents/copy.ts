import { createHash } from 'node:crypto'
import type { Payload } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { attachDocumentCharacterLink, attachDocumentTag, getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { copyLifecycle, resolveCrossDomainType } from '@/lib/documents/operationInvariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

async function requireAdmin(payload: Payload, userId: number | string, domainId: number | string) {
  const authorized = await authorizeInterimOperation(payload, { userId }, domainId)
  if (authorized !== true) throw new Error(authorized)
}

async function rootFolder(payload: Payload, domainId: number | string) {
  const roots = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1, overrideAccess: true })
  return roots.docs[0]?.id ?? null
}

async function destinationFolder(payload: Payload, domainId: number | string, folderId?: number | string | null) {
  const id = folderId == null || folderId === '' ? await rootFolder(payload, domainId) : Number(folderId)
  if (!id) throw new Error('Destination Domain has no root Folder.')
  const folder = await payload.findByID({ collection: 'folders', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!folder || idOf(folder.domain) !== Number(domainId)) throw new Error('Destination Folder is outside the selected Domain.')
  return folder
}

export async function copyDocument(args: { payload: Payload; sourceDocumentId: number | string; destinationDomainId: number | string; destinationFolderId?: number | string | null; actorUserId: number | string; actorCharacterId?: number | string | null; confirmCrossDomain?: boolean }) {
  const { payload, sourceDocumentId, destinationDomainId, actorUserId, actorCharacterId } = args
  const source = await payload.findByID({ collection: 'documents', id: sourceDocumentId, depth: 1, overrideAccess: true })
  if (!source) throw new Error('Source Document not found.')
  const sourceDomainId = idOf(source.domain)
  if (!sourceDomainId) throw new Error('Source Document has no Domain.')
  await requireAdmin(payload, actorUserId, sourceDomainId)
  await requireAdmin(payload, actorUserId, destinationDomainId)
  const destinationDomain = await payload.findByID({ collection: 'domains', id: destinationDomainId, depth: 0, overrideAccess: true })
  const sourceDomain = await payload.findByID({ collection: 'domains', id: sourceDomainId, depth: 0, overrideAccess: true })
  if (!destinationDomain || !sourceDomain) throw new Error('Domain not found.')
  const crossDomain = Number(sourceDomainId) !== Number(destinationDomainId)
  if (crossDomain && args.confirmCrossDomain !== true) throw new Error('Cross-Domain copy requires explicit confirmation.')
  const folder = await destinationFolder(payload, destinationDomainId, args.destinationFolderId)
  const sourceType = typeof source.documentType === 'object' ? source.documentType : await payload.findByID({ collection: 'document-types', id: source.documentType, depth: 0, overrideAccess: true })
  const destinationTypes = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: destinationDomainId } }, { active: { equals: true } }] }, depth: 0, limit: 1000, overrideAccess: true })
  const plain = destinationTypes.docs.find((type) => type.name.toLowerCase() === 'plain text')?.id ?? null
  const destinationTypeId = crossDomain ? resolveCrossDomainType(sourceType.name, destinationTypes.docs.map((type) => ({ id: type.id, name: type.name, active: type.active })), plain) : Number(sourceType.id)
  if (!destinationTypeId) throw new Error('No compatible destination Document Type exists.')
  const bodyHash = createHash('sha256').update(source.body).digest('hex')
  const created = await payload.create({ collection: 'documents', context: { preparedByCharacterId: actorCharacterId ?? undefined, actorUserId }, overrideAccess: true, data: { domain: Number(destinationDomainId), title: source.title, body: source.body, origin: 'web-editor', sourceKind: 'copy', documentType: destinationTypeId, lifecycle: copyLifecycle(destinationDomain.kind), publicAccess: 'inherit', createdBy: Number(actorUserId), folder: folder.id } })
  const sourceLinks = await getDocumentCharacterLinks(payload, source.id)
  for (const link of sourceLinks.docs) {
    const characterId = idOf(link.character)
    if (characterId === null || (link.kind === 'prepared_by' && characterId === Number(actorCharacterId))) continue
    await attachDocumentCharacterLink({ payload, domainId: destinationDomainId, documentId: created.id, characterId, kind: link.kind, relationshipLabel: link.relationshipLabel, actor: { userId: actorUserId, characterId: actorCharacterId }, requiredByCreate: false, skipAuthorization: true })
  }
  const sourceTags = await getDocumentTags(payload, source.id)
  for (const sourceTagLink of sourceTags.docs) {
    const sourceTag = typeof sourceTagLink.tag === 'object' ? sourceTagLink.tag : await payload.findByID({ collection: 'tags', id: sourceTagLink.tag, depth: 0, overrideAccess: true }).catch(() => null)
    if (!sourceTag) continue
    if (!crossDomain) {
      await payload.create({ collection: 'document-tags', overrideAccess: true, data: { domain: Number(destinationDomainId), document: created.id, tag: Number(sourceTag.id), actorUser: Number(actorUserId), actorCharacter: actorCharacterId == null ? undefined : Number(actorCharacterId) } })
      continue
    }
    const matching = await payload.find({ collection: 'tags', where: { and: [{ domain: { equals: destinationDomainId } }, { normalizedName: { equals: sourceTag.name.toLocaleLowerCase() } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (matching.docs[0]) await attachDocumentTag({ payload, domainId: destinationDomainId, documentId: created.id, tagId: matching.docs[0].id, actor: { userId: actorUserId, characterId: actorCharacterId }, skipAuthorization: true })
  }
  await recordDocumentProvenance({ payload, domainId: sourceDomainId, documentId: source.id, eventType: 'copied_to', actorUserId, actorCharacterId, context: { destinationDomainId: Number(destinationDomainId), destinationDocumentId: created.id, sourceBodySha256: bodyHash } })
  await recordDocumentProvenance({ payload, domainId: destinationDomainId, documentId: created.id, eventType: 'copied_from', actorUserId, actorCharacterId, context: { sourceDomainId: Number(sourceDomainId), sourceDocumentId: source.id, sourceBodySha256: bodyHash, crossDomain } , revisionId: await latestDocumentRevisionId(payload, created.id) })
  return created
}

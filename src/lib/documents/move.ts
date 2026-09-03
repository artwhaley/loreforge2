import type { Payload } from 'payload'

import { authorizeInterimOperation } from '@/lib/authorization/interim'
import { latestDocumentRevisionId, recordDocumentProvenance } from '@/lib/documents/provenance'
import { getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'
import { resolveCrossDomainType } from '@/lib/documents/operationInvariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

async function admin(payload: Payload, userId: number | string, domainId: number | string) {
  const authorized = await authorizeInterimOperation(payload, { userId }, domainId)
  if (authorized !== true) throw new Error(authorized)
}

async function folderInDomain(payload: Payload, domainId: number | string, folderId: number | string) {
  const folder = await payload.findByID({ collection: 'folders', id: folderId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!folder || idOf(folder.domain) !== Number(domainId)) throw new Error('Destination Folder is outside the selected Domain.')
  return folder
}

export async function moveDocument(args: { payload: Payload; documentId: number | string; sourceDomainId: number | string; destinationDomainId: number | string; destinationFolderId: number | string; actorUserId: number | string; actorCharacterId?: number | string | null; confirmCrossDomain?: boolean }) {
  const { payload, documentId, sourceDomainId, destinationDomainId, destinationFolderId, actorUserId, actorCharacterId } = args
  await admin(payload, actorUserId, sourceDomainId)
  await admin(payload, actorUserId, destinationDomainId)
  const document = await payload.findByID({ collection: 'documents', id: documentId, depth: 0, overrideAccess: true })
  if (!document || idOf(document.domain) !== Number(sourceDomainId)) throw new Error('Document is outside the source Domain.')
  const destinationFolder = await folderInDomain(payload, destinationDomainId, destinationFolderId)
  const crossDomain = Number(sourceDomainId) !== Number(destinationDomainId)
  if (crossDomain) {
    const sourceDomain = await payload.findByID({ collection: 'domains', id: sourceDomainId, depth: 0, overrideAccess: true })
    if (!sourceDomain?.allowCrossDomainMove) throw new Error('Cross-Domain move is disabled by the source Domain.')
    if (args.confirmCrossDomain !== true) throw new Error('Cross-Domain move requires explicit confirmation.')
    const destinationTypes = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: destinationDomainId } }, { active: { equals: true } }] }, depth: 0, limit: 1000, overrideAccess: true })
    const sourceType = typeof document.documentType === 'object' ? document.documentType : await payload.findByID({ collection: 'document-types', id: document.documentType, depth: 0, overrideAccess: true })
    const plain = destinationTypes.docs.find((type) => type.name.toLowerCase() === 'plain text')?.id ?? null
    const typeId = resolveCrossDomainType(sourceType.name, destinationTypes.docs.map((type) => ({ id: type.id, name: type.name, active: type.active })), plain)
    if (!typeId) throw new Error('No compatible destination Document Type exists.')
    const links = await getDocumentCharacterLinks(payload, document.id)
    for (const link of links.docs) await payload.update({ collection: 'document-character-links', id: link.id, overrideAccess: true, data: { domain: Number(destinationDomainId) } })
    const tags = await getDocumentTags(payload, document.id)
    const destinationTags = await payload.find({ collection: 'tags', where: { domain: { equals: destinationDomainId } }, depth: 0, limit: 5000, overrideAccess: true })
    for (const tagLink of tags.docs) {
      const sourceTag = typeof tagLink.tag === 'object' ? tagLink.tag : await payload.findByID({ collection: 'tags', id: tagLink.tag, depth: 0, overrideAccess: true }).catch(() => null)
      const mapped = sourceTag ? destinationTags.docs.find((tag) => tag.name.toLocaleLowerCase() === sourceTag.name.toLocaleLowerCase()) : null
      if (mapped) await payload.update({ collection: 'document-tags', id: tagLink.id, overrideAccess: true, data: { domain: Number(destinationDomainId), tag: mapped.id } })
      else await payload.delete({ collection: 'document-tags', id: tagLink.id, overrideAccess: true })
    }
    // Document shares are Domain-local grants. They must not remain pointed
    // at a Document after its Domain changes; the owner can re-share it in
    // the destination Domain explicitly.
    const sourceShares = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: sourceDomainId } }, { resourceType: { equals: 'Document' } }, { resource: { equals: document.id } }] }, depth: 0, limit: 5000, overrideAccess: true }).catch(() => ({ docs: [] }))
    for (const share of sourceShares.docs) await payload.delete({ collection: 'permission-rules', id: share.id, overrideAccess: true })
    await payload.update({ collection: 'documents', id: document.id, overrideAccess: true, data: { domain: Number(destinationDomainId), folder: Number(destinationFolder.id), documentType: typeId } })
    await recordDocumentProvenance({ payload, domainId: sourceDomainId, documentId: document.id, eventType: 'moved', actorUserId, actorCharacterId, context: { destinationDomainId: Number(destinationDomainId), destinationFolderId: Number(destinationFolder.id), crossDomain: true, sourceAuditPointer: true }, revisionId: await latestDocumentRevisionId(payload, document.id) })
    await recordDocumentProvenance({ payload, domainId: destinationDomainId, documentId: document.id, eventType: 'moved', actorUserId, actorCharacterId, context: { sourceDomainId: Number(sourceDomainId), sourceAuditPointer: true, removedDomainLocalShares: sourceShares.docs.length }, revisionId: await latestDocumentRevisionId(payload, document.id) })
    return document
  }
  const previousFolderId = idOf(document.folder)
  await payload.update({ collection: 'documents', id: document.id, overrideAccess: true, data: { folder: Number(destinationFolder.id) } })
  await recordDocumentProvenance({ payload, domainId: sourceDomainId, documentId: document.id, eventType: 'moved', actorUserId, actorCharacterId, context: { fromFolderId: previousFolderId, toFolderId: Number(destinationFolder.id), folderName: destinationFolder.name }, revisionId: await latestDocumentRevisionId(payload, document.id) })
  return document
}

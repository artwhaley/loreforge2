import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'
import { loadAuthorizationSession } from '@/lib/authz/session'
import { compileReadScope } from '@/lib/authz/readScope'

const relationId = (value: unknown): number | null => typeof value === 'object' && value !== null && 'id' in value
  ? Number((value as { id: number }).id)
  : typeof value === 'number' ? value : null

/**
 * P07P-05 authorized Records search (server-side, complete beyond the first
 * 100). One request-owned session + one compiled read scope; the A/G/D
 * predicate, folder selection, type filter, and case-insensitive substring
 * text match all happen in SQL BEFORE any projection. Bodies are never
 * serialized — only id/title/folder/type/date/lifecycle/preparedBy/flags.
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return NextResponse.json({ results: [] }, { status: 403 })
  const url = new URL(request.url)
  const domainSlug = url.searchParams.get('domainSlug')?.trim() ?? ''
  const query = url.searchParams.get('q')?.trim() ?? ''
  const folderRaw = url.searchParams.get('folder')
  const typeRaw = url.searchParams.get('type')
  const subfolders = url.searchParams.get('subfolders') !== 'false'
  const cursorRaw = url.searchParams.get('cursor')
  if (!domainSlug) return NextResponse.json({ results: [] }, { status: 403 })
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.json({ results: [] }, { status: 403 })
  const acting = await resolveActingIdentity(payload, request, user.id)
  const activeCharacterId = acting.tenantSlug === domainSlug ? acting.characterId : null

  const session = await loadAuthorizationSession(payload, { userId: user.id, activeCharacterId }, domain.id)
  const scope = await compileReadScope(payload, session)

  // Folder scope: selected folder (+ descendants when searching subfolders).
  let folderIds: number[] | null = null
  const selectedFolderId = folderRaw && Number.isFinite(Number(folderRaw)) ? Number(folderRaw) : null
  if (selectedFolderId !== null) {
    const descendants: number[] = [selectedFolderId]
    if (subfolders && query) {
      // Walk descendant folders in-memory from session facts (bounded metadata
      // traversal, no per-folder SQL).
      const byParent = new Map<number, number[]>()
      for (const [id, node] of session.folders) {
        if (node.parentId != null) {
          const bucket = byParent.get(node.parentId) ?? []
          bucket.push(id)
          byParent.set(node.parentId, bucket)
        }
      }
      const queue = [selectedFolderId]
      const visited = new Set<number>([selectedFolderId])
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const child of byParent.get(current) ?? []) {
          if (!visited.has(child)) { visited.add(child); descendants.push(child); queue.push(child) }
        }
      }
    }
    folderIds = descendants
  }

  // P07X-T03: the record predicate is the two-axis scope — readable Types as
  // the grant source, denied-Folder ancestry as the narrowing, plus direct
  // Document exceptions. Folder grants alone no longer expose Documents.
  const readableTypeIds = [...scope.readableTypeIds]
  const denyFolderIds = [...scope.denyFolderIds]
  const grantIds = [...scope.grantDocumentIds]
  const denyIds = [...scope.denyDocumentIds]
  const textMatch = query ? { or: [{ title: { like: query } }, { body: { like: query } }] } : undefined
  const typeMatch = typeRaw && Number.isFinite(Number(typeRaw)) ? { documentType: { equals: Number(typeRaw) } } : undefined

  const where: Record<string, unknown> = {
    and: [
      { domain: { equals: domain.id } },
      { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] },
      ...(folderIds ? [{ folder: { in: folderIds } }] : []),
      ...(typeMatch ? [typeMatch] : []),
      ...(textMatch ? [textMatch] : []),
      ...(scope.authorityBypass ? [] : [
        { id: { not_in: denyIds.length > 0 ? denyIds : [-1] } },
        {
          or: [
            { and: [{ documentType: { in: readableTypeIds.length > 0 ? readableTypeIds : [-1] } }, { folder: { not_in: denyFolderIds.length > 0 ? denyFolderIds : [-1] } }] },
            { id: { in: grantIds.length > 0 ? grantIds : [-1] } },
          ],
        },
      ]),
    ],
  }

  // Search is correctness-complete: do not silently stop at the old first
  // 100/500 rows. The explorer may window or paginate the projected response,
  // but the server predicate itself is applied before any client filtering.
  const documentSelect = { id: true, domain: true, folder: true, documentType: true, title: true, updatedAt: true, lifecycle: true } as const
  const documents = await payload.find({ collection: 'documents', where: where as never, select: documentSelect, depth: 0, limit: 0, pagination: false, sort: '-updatedAt', overrideAccess: true })
  const matchingDocuments = [...documents.docs]
  const allDocuments = new Map<number, typeof documents.docs[number]>(documents.docs.map((document) => [Number(document.id), document]))
  const supersessionEdges: Array<{ newerId: number; olderId: number }> = []
  const seenEdges = new Set<string>()
  let frontier = [...allDocuments.keys()]
  // Close each returned result over its readable supersession chain. The edge
  // projection contains IDs only; linked metadata is rechecked by the same
  // Domain/ACL predicate before it is returned to the browser.
  while (frontier.length > 0) {
    const nextIds = new Set<number>()
    for (let offset = 0; offset < frontier.length; offset += 400) {
      const batch = frontier.slice(offset, offset + 400)
      const edgeResult = await payload.find({ collection: 'document-relationships', where: { and: [{ domain: { equals: domain.id } }, { kind: { equals: 'supersedes' } }, { or: [{ source: { in: batch } }, { target: { in: batch } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
      for (const edge of edgeResult.docs) {
        const newerId = relationId(edge.source)
        const olderId = relationId(edge.target)
        if (newerId === null || olderId === null) continue
        const key = `${newerId}:${olderId}`
        if (!seenEdges.has(key)) supersessionEdges.push({ newerId, olderId })
        seenEdges.add(key)
        if (!allDocuments.has(newerId)) nextIds.add(newerId)
        if (!allDocuments.has(olderId)) nextIds.add(olderId)
      }
    }
    const linkedIds = [...nextIds]
    frontier = []
    for (let offset = 0; offset < linkedIds.length; offset += 400) {
      const batch = linkedIds.slice(offset, offset + 400)
      const linkedResult = await payload.find({ collection: 'documents', where: { and: [
        { domain: { equals: domain.id } },
        { id: { in: batch } },
        { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] },
        ...(scope.authorityBypass ? [] : [
          { id: { not_in: denyIds.length ? denyIds : [-1] } },
          { or: [
            { and: [{ documentType: { in: readableTypeIds.length ? readableTypeIds : [-1] } }, { folder: { not_in: denyFolderIds.length ? denyFolderIds : [-1] } }] },
            { id: { in: grantIds.length ? grantIds : [-1] } },
          ] },
        ]),
      ] }, select: documentSelect, depth: 0, limit: 0, pagination: false, overrideAccess: true })
      for (const linked of linkedResult.docs) {
        const id = Number(linked.id)
        if (allDocuments.has(id)) continue
        allDocuments.set(id, linked)
        frontier.push(id)
      }
    }
  }
  // A search match identifies a supersession group, not an isolated row. The
  // cursor is an opaque (updatedAt, stable ID) key for the newest matching
  // member of each group. We close chains before paging so a title/body match
  // on an old version still returns the complete readable group in one box.
  const newerByOlder = new Map<number, number[]>()
  const olderByNewer = new Map<number, number[]>()
  for (const edge of supersessionEdges) {
    const newer = newerByOlder.get(edge.olderId) ?? []
    newer.push(edge.newerId)
    newerByOlder.set(edge.olderId, newer)
    const older = olderByNewer.get(edge.newerId) ?? []
    older.push(edge.olderId)
    olderByNewer.set(edge.newerId, older)
  }
  const rootFor = (id: number) => {
    const visited = new Set<number>()
    let current = id
    while (!visited.has(current)) {
      visited.add(current)
      // Edges are collected before linked-document ACL checks finish. Never
      // let an unreadable successor become the page's root or disclose its ID.
      const parents = (newerByOlder.get(current) ?? []).filter((parentId) => allDocuments.has(parentId))
      if (parents.length === 0) break
      current = parents.slice().sort((a, b) => a - b)[0]
    }
    return current
  }
  const groups = new Map<number, { updatedAt: string; id: number }>()
  for (const document of matchingDocuments) {
    const id = Number(document.id)
    const root = rootFor(id)
    const candidate = { updatedAt: String(document.updatedAt), id }
    const current = groups.get(root)
    if (!current || candidate.updatedAt > current.updatedAt || (candidate.updatedAt === current.updatedAt && candidate.id > current.id)) groups.set(root, candidate)
  }
  const orderedGroups = [...groups.entries()].sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)
  let cursor: { updatedAt: string; id: number } | null = null
  if (cursorRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(cursorRaw, 'base64url').toString('utf8')) as { updatedAt?: unknown; id?: unknown }
      if (typeof decoded.updatedAt === 'string' && Number.isInteger(decoded.id)) cursor = { updatedAt: decoded.updatedAt, id: Number(decoded.id) }
    } catch { /* malformed cursors fail closed to the first page */ }
  }
  const afterCursor = cursor
    ? orderedGroups.filter(([, key]) => key.updatedAt < cursor!.updatedAt || (key.updatedAt === cursor!.updatedAt && key.id < cursor!.id))
    : orderedGroups
  const pageGroups = afterCursor.slice(0, 50)
  const hasMore = afterCursor.length > pageGroups.length
  const nextCursor = hasMore && pageGroups.length > 0
    ? Buffer.from(JSON.stringify(pageGroups[pageGroups.length - 1][1])).toString('base64url')
    : null
  const selectedIds = new Set<number>()
  const addChain = (id: number, visited = new Set<number>()) => {
    if (visited.has(id)) return
    visited.add(id)
    if (!allDocuments.has(id)) return
    selectedIds.add(id)
    for (const olderId of olderByNewer.get(id) ?? []) addChain(olderId, visited)
  }
  for (const [root] of pageGroups) addChain(root)
  const pageDocuments = pageGroups.flatMap(([root]) => {
    const idsForGroup: number[] = []
    const visit = (id: number, visited = new Set<number>()) => {
      if (visited.has(id) || !selectedIds.has(id)) return
      visited.add(id)
      idsForGroup.push(id)
      for (const olderId of olderByNewer.get(id) ?? []) visit(olderId, visited)
    }
    visit(root)
    return idsForGroup
  })
  const ids = [...selectedIds]
  const preparedLinks: { docs: Array<Record<string, unknown>> } = { docs: [] }
  for (let offset = 0; offset < ids.length; offset += 400) {
    const batch = ids.slice(offset, offset + 400)
    const result = await payload.find({ collection: 'document-character-links', where: { and: [{ document: { in: batch } }, { kind: { equals: 'prepared_by' } }] }, depth: 1, limit: 0, pagination: false, overrideAccess: true })
    preparedLinks.docs.push(...result.docs as unknown as Array<Record<string, unknown>>)
  }
  const types = await payload.find({ collection: 'document-types', where: { domain: { equals: domain.id } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  const preparedBy = new Map<number, string>()
  for (const link of [...preparedLinks.docs].filter((link) => selectedIds.has(relationId(link.document) ?? -1)).sort((a, b) => Number(a.id) - Number(b.id))) {
    const documentId = relationId(link.document)
    const character = typeof link.character === 'object' && link.character !== null ? link.character as { name?: string } : null
    if (documentId !== null && character?.name) preparedBy.set(documentId, [preparedBy.get(documentId), character.name].filter(Boolean).join(', '))
  }
  const typeName = new Map(types.docs.map((type) => [Number(type.id), type.name]))

  return NextResponse.json({
    results: pageDocuments.map((id) => allDocuments.get(id)!).map((document) => ({
      id: Number(document.id),
      title: document.title,
      folderId: relationId(document.folder),
      documentTypeId: relationId(document.documentType),
      documentTypeName: relationId(document.documentType) != null ? typeName.get(relationId(document.documentType)!) ?? null : null,
      updatedAt: document.updatedAt,
      preparedBy: preparedBy.get(Number(document.id)) ?? null,
      lifecycle: document.lifecycle,
    })),
    supersessionEdges: supersessionEdges.filter((edge) => selectedIds.has(edge.newerId) && selectedIds.has(edge.olderId)),
    nextCursor,
  })
}

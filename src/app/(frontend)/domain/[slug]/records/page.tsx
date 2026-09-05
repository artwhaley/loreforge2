import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'
import { decideInSession, resolveDocumentTarget } from '@/lib/authz/session'
import { compileReadScope } from '@/lib/authz/readScope'
import { projectVisibleFolders, type ProjectedFolder } from '@/lib/authz/folderProjection'

import { RecordsExplorer, type ExplorerFolder } from './RecordsExplorer'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ folder?: string; q?: string }>
}

export const dynamic = 'force-dynamic'

const relationId = (value: unknown): number | null => typeof value === 'object' && value !== null && 'id' in value
  ? Number((value as { id: number }).id)
  : typeof value === 'number' ? value : null

export default async function RecordsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { folder: folderRaw, q } = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()

  const base = `/domain/${tenant.slug}`
  const payload = await getLorePayload()
  const [folders, myTenants] = await Promise.all([
    getFoldersForTenant(tenant),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  // P07P-02: one request-owned session replaces per-document evaluator loads.
  // The initial explorer page is a lightweight 50-row window; nonblank
  // searches use the complete authorized server query below and never ship
  // document bodies to the browser.
  const session = user ? await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id) : null
  const scope = session ? await compileReadScope(payload, session) : null
  // P07X-T03: the two-axis record predicate — readable Types as the grant
  // source, denied-Folder ancestry as narrowing, plus direct Document
  // exceptions. Folder-read grants alone no longer expose Documents.
  const documentsResult = await payload.find({ collection: 'documents', where: { and: [
    { domain: { equals: tenant.id } },
    { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] },
    ...(scope && !scope.authorityBypass ? [
      { id: { not_in: scope.denyDocumentIds.size ? [...scope.denyDocumentIds] : [-1] } },
      { or: [
        { and: [{ documentType: { in: scope.readableTypeIds.size ? [...scope.readableTypeIds] : [-1] } }, { folder: { not_in: scope.denyFolderIds.size ? [...scope.denyFolderIds] : [-1] } }] },
        { id: { in: scope.grantDocumentIds.size ? [...scope.grantDocumentIds] : [-1] } },
      ] },
    ] : []),
  ] }, select: { id: true, domain: true, folder: true, documentType: true, title: true, updatedAt: true, lifecycle: true }, depth: 0, limit: 50, sort: '-updatedAt', overrideAccess: true })
  const permissions = new Map<number, { read: boolean; canEdit: boolean; canSupersede: boolean; canDelete: boolean }>()
  const visibleDocs: typeof documentsResult.docs = []
  if (session) {
    for (const document of documentsResult.docs) {
      const target = resolveDocumentTarget(session, { id: Number(document.id), folderId: relationId(document.folder), subdomainId: null, documentTypeId: relationId(document.documentType) })
      const read = decideInSession(session, 'read', target).allowed
      if (!read) continue
      visibleDocs.push(document)
      const canEdit = decideInSession(session, 'edit_document', target).allowed
      // P07X-T03: supersession is a Type-gated create (create_document on the
      // record's Document Type) — the destination Folder is Type-routed, not
      // a customer choice.
      const typeId = relationId(document.documentType)
      const canSupersede = typeId !== null && decideInSession(session, 'create_document', { type: 'DocumentType', id: typeId }).allowed
      const canDelete = decideInSession(session, 'delete_document', target).allowed
      permissions.set(Number(document.id), { read, canEdit, canSupersede, canDelete })
    }
  }
  const allDocs: typeof documentsResult.docs = [...visibleDocs]
  const canManageFolders = session ? decideInSession(session, 'manage_folders', { type: 'Domain', id: Number(tenant.id) }).allowed : false
  const canDeleteRecords = session ? decideInSession(session, 'delete_document', { type: 'Domain', id: Number(tenant.id) }).allowed : false
  // Load only the supersession edges touching this page's readable window,
  // then walk outward until the complete readable chain is closed. This keeps
  // old versions under the current record without scanning every Domain edge
  // or exposing hidden linked titles.
  const allDocIds = new Set(allDocs.map((document) => Number(document.id)))
  const relationships: { docs: Array<{ id: number | string; source: unknown; target: unknown; kind?: string }> } = { docs: [] }
  let frontier = [...allDocIds]
  const seenEdges = new Set<string>()
  while (frontier.length > 0) {
    const nextIds = new Set<number>()
    for (let offset = 0; offset < frontier.length; offset += 400) {
      const batch = frontier.slice(offset, offset + 400)
      const result = await payload.find({ collection: 'document-relationships', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'supersedes' } }, { or: [{ source: { in: batch } }, { target: { in: batch } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
      for (const relationship of result.docs) {
        const newerId = relationId(relationship.source)
        const olderId = relationId(relationship.target)
        if (newerId === null || olderId === null) continue
        const edgeKey = `${newerId}:${olderId}`
        if (!seenEdges.has(edgeKey)) relationships.docs.push({ id: relationship.id, source: newerId, target: olderId, kind: relationship.kind })
        seenEdges.add(edgeKey)
        if (!allDocIds.has(newerId)) nextIds.add(newerId)
        if (!allDocIds.has(olderId)) nextIds.add(olderId)
      }
    }
    const linkedIds = [...nextIds]
    frontier = []
    for (let offset = 0; offset < linkedIds.length; offset += 400) {
      const batch = linkedIds.slice(offset, offset + 400)
      const result = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: tenant.id } }, { id: { in: batch } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, select: { id: true, domain: true, folder: true, documentType: true, title: true, updatedAt: true, lifecycle: true }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
      for (const document of result.docs) {
        const documentId = Number(document.id)
        if (allDocIds.has(documentId)) continue
        allDocIds.add(documentId)
        if (session) {
          const target = resolveDocumentTarget(session, { id: documentId, folderId: relationId(document.folder), subdomainId: null, documentTypeId: relationId(document.documentType) })
          if (!decideInSession(session, 'read', target).allowed) continue
          allDocs.push(document)
          const canEdit = decideInSession(session, 'edit_document', target).allowed
          const typeId = relationId(document.documentType)
          const canSupersede = typeId !== null && decideInSession(session, 'create_document', { type: 'DocumentType', id: typeId }).allowed
          permissions.set(documentId, { read: true, canEdit, canSupersede, canDelete: decideInSession(session, 'delete_document', target).allowed })
        }
        frontier.push(documentId)
      }
    }
  }
  const [preparedLinks, documentTypes] = await Promise.all([
    allDocs.length === 0 ? { docs: [] } : payload.find({ collection: 'document-character-links', where: { and: [{ document: { in: allDocs.map((document) => document.id) } }, { kind: { equals: 'prepared_by' } }] }, depth: 1, limit: 0, pagination: false, overrideAccess: true }),
    payload.find({ collection: 'document-types', where: { domain: { equals: tenant.id } }, depth: 0, limit: 0, pagination: false, sort: 'name' }),
  ])

  // P05R-T04 I: keep every Prepared-by credit, joined deterministically by
  // link id so no duplicate-credit record shows only its first author.
  const preparedBy = new Map<number, string>()
  for (const link of [...preparedLinks.docs].sort((a, b) => Number(a.id) - Number(b.id))) {
    const documentId = relationId(link.document)
    const character = typeof link.character === 'object' ? link.character : null
    if (documentId !== null && character?.name) preparedBy.set(documentId, [preparedBy.get(documentId), character.name].filter(Boolean).join(', '))
  }
  // P07X-T04: the Folder navigator is the permission-aware projection — only
  // Folders with readable records, explicit Folder-read/management grants, or
  // ancestor paths appear; denied branches and hidden counts never reach the
  // client. Counts are the server-filtered readable totals, not a client
  // recount over hidden rows.
  const projection = session ? await projectVisibleFolders({ payload, session, folders: folders as never }) : { tree: [] as ProjectedFolder[], folderRecordCounts: new Map<number, number>(), totalReadable: 0 }
  const toExplorerFolder = (node: ProjectedFolder): ExplorerFolder => ({
    id: node.id,
    name: node.name,
    systemManaged: node.systemManaged,
    recordCount: node.recordCount,
    children: node.children.map(toExplorerFolder),
  })
  const initialFolderId = folderRaw && Number.isFinite(Number(folderRaw)) ? Number(folderRaw) : null
  const supersessionEdges = relationships.docs.flatMap((relationship) => {
    const newerId = relationId(relationship.source)
    const olderId = relationId(relationship.target)
    return newerId !== null && olderId !== null && allDocs.some((d) => d.id === newerId) && allDocs.some((d) => d.id === olderId) ? [{ newerId, olderId }] : []
  })

  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={myTenants} activeCharacter={activeCharacter}>
    <RecordsExplorer
      base={base}
      tenantSlug={tenant.slug}
      folders={projection.tree.map(toExplorerFolder)}
      totalRecordCount={projection.totalReadable}
      records={allDocs.map((document) => ({ id: Number(document.id), title: document.title, folderId: relationId(document.folder), documentTypeId: relationId(document.documentType), updatedAt: document.updatedAt, preparedBy: preparedBy.get(Number(document.id)) ?? null, lifecycle: document.lifecycle, ...permissions.get(Number(document.id))! }))}
      documentTypes={documentTypes.docs.map((type) => ({ id: Number(type.id), name: type.name }))}
      supersessionEdges={supersessionEdges}
      initialFolderId={initialFolderId}
      initialSearch={typeof q === 'string' ? q.trim() : ''}
      canManageFolders={canManageFolders}
      canActOnRecords={Boolean(user)}
      canDeleteRecords={canDeleteRecords}
      vocabulary={{ documentSingular: vocab.document.singular, documentPlural: vocab.document.plural, folderPlural: vocab.folder.plural }}
    />
  </TenantShell>
}

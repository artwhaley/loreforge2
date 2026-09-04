import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { buildFolderTree } from '@/lib/archive/folderTree'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentsForTenant, getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

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
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()

  const base = `/domain/${tenant.slug}`
  const [folders, allDocs, myTenants] = await Promise.all([
    getFoldersForTenant(tenant),
    getDocumentsForTenant(tenant),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  const payload = await getLorePayload()
  const [relationships, preparedLinks, documentTypes] = await Promise.all([
    payload.find({ collection: 'document-relationships', where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'supersedes' } }] }, depth: 0, limit: 5000, overrideAccess: true }),
    payload.find({ collection: 'document-character-links', where: { and: [{ document: { in: allDocs.map((document) => document.id) } }, { kind: { equals: 'prepared_by' } }] }, depth: 1, limit: 5000, overrideAccess: true }),
    payload.find({ collection: 'document-types', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name' }),
  ])

  // P05R-T04 I: keep every Prepared-by credit, joined deterministically by
  // link id so no duplicate-credit record shows only its first author.
  const preparedBy = new Map<number, string>()
  for (const link of [...preparedLinks.docs].sort((a, b) => Number(a.id) - Number(b.id))) {
    const documentId = relationId(link.document)
    const character = typeof link.character === 'object' ? link.character : null
    if (documentId !== null && character?.name) preparedBy.set(documentId, [preparedBy.get(documentId), character.name].filter(Boolean).join(', '))
  }
  const tree = buildFolderTree(folders)
  const toExplorerFolder = (node: (typeof tree)[number]): ExplorerFolder => ({
    id: Number(node.folder.id),
    name: node.folder.name,
    systemManaged: Boolean(node.folder.systemManaged),
    children: node.children.map(toExplorerFolder),
  })
  const initialFolderId = folderRaw && Number.isFinite(Number(folderRaw)) ? Number(folderRaw) : null
  const supersessionEdges = relationships.docs.flatMap((relationship) => {
    const newerId = relationId(relationship.source)
    const olderId = relationId(relationship.target)
    return newerId !== null && olderId !== null ? [{ newerId, olderId }] : []
  })

  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={myTenants}>
    <RecordsExplorer
      base={base}
      tenantSlug={tenant.slug}
      folders={tree.map(toExplorerFolder)}
      records={allDocs.map((document) => ({ id: Number(document.id), title: document.title, body: document.body, folderId: relationId(document.folder), documentTypeId: relationId(document.documentType), updatedAt: document.updatedAt, preparedBy: preparedBy.get(Number(document.id)) ?? null, lifecycle: document.lifecycle }))}
      documentTypes={documentTypes.docs.map((type) => ({ id: Number(type.id), name: type.name }))}
      supersessionEdges={supersessionEdges}
      initialFolderId={initialFolderId}
      initialSearch={typeof q === 'string' ? q.trim() : ''}
      canManageFolders={role === 'admin'}
      canActOnRecords={Boolean(user)}
    />
  </TenantShell>
}

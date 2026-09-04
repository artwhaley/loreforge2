import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { DeleteFolderButton } from '@/components/archive/DeleteFolderButton'
import { TenantShell } from '@/components/theme/TenantShell'
import { createFolderAction } from '@/lib/actions/archive'
import { buildFolderTree, flattenFolderTree, folderPath } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import {
  getDocumentsForTenant,
  getFoldersForTenant,
  getFolderForTenant,
  getTenantsForUser,
  searchDocumentsForTenant,
} from '@/lib/tenant/queries'
import { getLorePayload } from '@/lib/payload'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './records.module.scss'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ folder?: string; q?: string }>
}

export const dynamic = 'force-dynamic'

export default async function RecordsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { folder: folderRaw, q } = await searchParams
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const base = `/domain/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const tokens = resolveThemeTokens(tenant)

  const folders = await getFoldersForTenant(tenant)
  const tree = buildFolderTree(folders)
  const flat = flattenFolderTree(tree)

  const currentFolderId = folderRaw ? Number(folderRaw) : null
  const currentFolder = currentFolderId ? await getFolderForTenant(tenant, currentFolderId) : null

  const query = typeof q === 'string' ? q.trim() : ''

  // All documents for counts + as the folder list source (small MVP dataset).
  const allDocs = await getDocumentsForTenant(tenant)
  const countByFolder = new Map<number, number>()
  for (const doc of allDocs) {
    const fid = typeof doc.folder === 'object' ? doc.folder?.id ?? null : doc.folder ?? null
    if (fid !== null && fid !== undefined) {
      countByFolder.set(fid, (countByFolder.get(fid) ?? 0) + 1)
    }
  }

  // Parent folder ids (folders that contain at least one subfolder).
  const parentIds = new Set<number>()
  const collectParents = (node: (typeof tree)[number]) => {
    for (const child of node.children) {
      parentIds.add(node.folder.id)
      collectParents(child)
    }
  }
  tree.forEach(collectParents)

const docs = query
    ? await searchDocumentsForTenant(tenant, query)
    : currentFolder
      ? allDocs.filter((d) => {
          const fid = typeof d.folder === 'object' ? d.folder?.id ?? null : d.folder ?? null
          return fid === currentFolder.id
        })
      : allDocs

  // Build supersession trees from the complete Domain graph, then select the
  // trees touched by the current folder/search result. A search hit on an old
  // version therefore still renders its current parent and every older child.
  const payload = await getLorePayload()
  const relationships = await payload.find({
    collection: 'document-relationships',
    where: { and: [{ domain: { equals: tenant.id } }, { kind: { equals: 'supersedes' } }] },
    depth: 0,
    limit: 5000,
    overrideAccess: true,
  })
  const preparedLinks = await payload.find({
    collection: 'document-character-links',
    where: { and: [{ document: { in: allDocs.map((document) => document.id) } }, { kind: { equals: 'prepared_by' } }] },
    depth: 1,
    limit: 5000,
    overrideAccess: true,
  })
  const preparedBy = new Map<number, string>()
  for (const link of preparedLinks.docs) {
    const documentId = typeof link.document === 'object' ? link.document.id : link.document
    const character = typeof link.character === 'object' ? link.character : null
    if (documentId && character?.name) preparedBy.set(Number(documentId), character.name)
  }
  const newerByOlder = new Map<number, number>()
  const olderByNewer = new Map<number, number>()
  for (const relationship of relationships.docs) {
    const newer = typeof relationship.source === 'object' ? relationship.source.id : relationship.source
    const older = typeof relationship.target === 'object' ? relationship.target.id : relationship.target
    if (newer && older) {
      newerByOlder.set(Number(older), Number(newer))
      olderByNewer.set(Number(newer), Number(older))
    }
  }
  type RecordNode = { doc: (typeof allDocs)[number]; children: RecordNode[] }
  const docsById = new Map(allDocs.map((document) => [Number(document.id), document]))
  const rootFor = (documentId: number) => {
    const visited = new Set<number>()
    let current = documentId
    while (newerByOlder.has(current) && !visited.has(current)) {
      visited.add(current)
      current = newerByOlder.get(current)!
    }
    return current
  }
  const buildTree = (documentId: number, visited = new Set<number>()): RecordNode | null => {
    const document = docsById.get(documentId)
    if (!document || visited.has(documentId)) return null
    const nextVisited = new Set(visited).add(documentId)
    const olderId = olderByNewer.get(documentId)
    const child = olderId ? buildTree(olderId, nextVisited) : null
    return { doc: document, children: child ? [child] : [] }
  }
  const selectedRoots = new Map<number, RecordNode>()
  for (const document of docs) {
    const rootId = rootFor(Number(document.id))
    const treeNode = buildTree(rootId)
    if (treeNode) selectedRoots.set(rootId, treeNode)
  }
  const recordDate = (value: unknown) => typeof value === 'string'
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null
  const renderRecordTree = (node: RecordNode, depth = 0): ReactNode => (
    <li key={node.doc.id} className={styles.item} style={{ marginLeft: `${depth * 1.5}rem` }}>
      <a className={styles.link} href={`${base}/documents/${node.doc.id}`}>
        {node.doc.title}
      </a>
      <div className={styles.itemMeta}>
        {recordDate(node.doc.updatedAt) ? (
          <span>{preparedBy.get(Number(node.doc.id)) ? `Prepared by ${preparedBy.get(Number(node.doc.id))} · ` : ''}Updated {recordDate(node.doc.updatedAt)}</span>
        ) : preparedBy.get(Number(node.doc.id)) ? <span>Prepared by {preparedBy.get(Number(node.doc.id))}</span> : null}
      </div>
      {node.children.length > 0 ? (
        <ul className={styles.supersessionChildren} aria-label={`Older versions of ${node.doc.title}`}>
          {node.children.map((child) => renderRecordTree(child, depth + 1))}
        </ul>
      ) : null}
    </li>
  )

  const breadcrumbs = currentFolder ? folderPath(folders, currentFolder.id) : []
  const crumbs = [...breadcrumbs, currentFolder].filter(Boolean) as typeof folders

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <div className={styles.browser}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.sidebarTitle}>Folders</h2>
            <form action={createFolderAction} className={styles.inlineForm}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="parentId" value={currentFolder?.id ?? ''} />
              <input className={styles.inlineInput} name="name" placeholder="New folder" aria-label="New folder name" />
              <button type="submit" className={styles.inlineSubmit}>
                Add
              </button>
            </form>
          </div>

          <ul className={styles.tree}>
            <li className={styles.treeItem}>
              <a
                className={currentFolderId === null && !query ? styles.treeLinkActive : styles.treeLink}
                href={`${base}/records`}
              >
                <span className={styles.treeName}>All records</span>
                <span className={styles.treeCount}>{allDocs.length}</span>
              </a>
            </li>
            {flat.map(({ folder, depth }) => {
              const isEmpty = !parentIds.has(folder.id) && (countByFolder.get(folder.id) ?? 0) === 0
              return (
                <li key={folder.id} className={styles.treeItem}>
                  <a
                    className={
                      currentFolderId === folder.id ? styles.treeLinkActive : styles.treeLink
                    }
                    href={`${base}/records?folder=${folder.id}`}
                    style={{ paddingLeft: `${0.75 + depth * 1.1}rem` }}
                  >
                    <span className={styles.treeName}>{folder.name}</span>
                    <span className={styles.treeCount}>{countByFolder.get(folder.id) ?? 0}</span>
                  </a>
                  {isEmpty ? (
                    <DeleteFolderButton tenantSlug={tenant.slug} folderId={folder.id} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </aside>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <form action={`${base}/records`} method="get" className={styles.searchForm}>
              <input
                className={styles.searchInput}
                name="q"
                defaultValue={query}
                placeholder="Search title or body"
                aria-label="Search records"
              />
              <button type="submit" className={styles.searchSubmit}>
                Search
              </button>
              {query ? (
                <a className={styles.clearSearch} href={`${base}/records`}>
                  Clear
                </a>
              ) : null}
            </form>

            <div className={styles.creationTools} aria-label="Create a record">
              <a className={styles.toolLink} href={`${base}/records/new${currentFolder ? `?folder=${currentFolder.id}` : ''}`}>New document</a>
              <a className={styles.toolLink} href={`${base}/import`}>Import notecard</a>
            </div>
          </div>

          {crumbs.length > 0 ? (
            <nav className={styles.crumbs} aria-label="Folder path">
              {crumbs.map((folder, index) => (
                <span key={folder.id} className={styles.crumbSep}>
                  {index > 0 ? ' / ' : ''}<a className={styles.crumb} href={`${base}/records?folder=${folder.id}`}>{folder.name}</a>
                </span>
              ))}
            </nav>
          ) : null}

          <h1 className={styles.pageTitle}>
            {query ? `Search results for “${query}”` : currentFolder ? currentFolder.name : 'All records'}
          </h1>

          {docs.length === 0 ? (
            <p className={styles.empty}>
              {query ? 'No records match your search.' : 'No records in this folder yet.'}
            </p>
          ) : (
            <ul className={styles.list}>
              {[...selectedRoots.values()].map((treeNode) => renderRecordTree(treeNode))}
            </ul>
          )}
        </main>
      </div>
    </TenantShell>
  )
}

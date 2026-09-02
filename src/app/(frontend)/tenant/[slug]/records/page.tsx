import { notFound } from 'next/navigation'

import { DeleteFolderButton } from '@/components/archive/DeleteFolderButton'
import { TenantShell } from '@/components/theme/TenantShell'
import { createDocumentAction, createFolderAction } from '@/lib/actions/archive'
import { buildFolderTree, flattenFolderTree, folderPath } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import {
  getDocumentsForTenant,
  getFoldersForTenant,
  getFolderForTenant,
  getTenantsForUser,
  searchDocumentsForTenant,
} from '@/lib/tenant/queries'
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

  const base = `/tenant/${tenant.slug}`
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

            <form action={createDocumentAction} className={styles.inlineForm}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="folderId" value={currentFolder?.id ?? ''} />
              <input className={styles.inlineInput} name="title" placeholder="New record title" aria-label="New record title" />
              <button type="submit" className={styles.inlineSubmit}>
                New record
              </button>
            </form>
          </div>

          <nav className={styles.crumbs} aria-label="Folder path">
            <a className={styles.crumb} href={`${base}/records`}>
              Records
            </a>
            {crumbs.map((folder) => (
              <span key={folder.id} className={styles.crumbSep}>
                / <a className={styles.crumb} href={`${base}/records?folder=${folder.id}`}>{folder.name}</a>
              </span>
            ))}
          </nav>

          <h1 className={styles.pageTitle}>
            {query ? `Search results for “${query}”` : currentFolder ? currentFolder.name : 'All records'}
          </h1>

          {docs.length === 0 ? (
            <p className={styles.empty}>
              {query ? 'No records match your search.' : 'No records in this folder yet.'}
            </p>
          ) : (
            <ul className={styles.list}>
              {docs.map((doc) => (
                <li key={doc.id} className={styles.item}>
                  <a className={styles.link} href={`${base}/documents/${doc.id}`}>
                    {doc.title}
                  </a>
                  <div className={styles.itemMeta}>
                    <span className={styles.origin}>{doc.origin.replace('-', ' ')}</span>
                    {typeof doc.updatedAt === 'string' ? (
                      <span>
                        Updated{' '}
                        {new Date(doc.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </TenantShell>
  )
}

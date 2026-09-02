import { notFound } from 'next/navigation'

import { CopyMarkdownButton } from '@/components/archive/CopyMarkdownButton'
import { TenantShell } from '@/components/theme/TenantShell'
import { deleteDocumentAction, moveDocumentAction } from '@/lib/actions/archive'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getFoldersForTenant } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './document.module.scss'

type Props = {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ source?: string }>
}

export const dynamic = 'force-dynamic'

export default async function DocumentViewPage({ params, searchParams }: Props) {
  const { slug, id } = await params
  const { source } = await searchParams
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const doc = await getDocumentForTenant(tenant, id)
  if (!doc) {
    notFound()
  }

  const folders = await getFoldersForTenant(tenant)
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const folderIdValue = typeof doc.folder === 'object' ? doc.folder?.id ?? '' : doc.folder ?? ''

  const tokens = resolveThemeTokens(tenant)
  const html = renderMarkdown(doc.body)
  const base = `/tenant/${tenant.slug}/documents/${doc.id}`

  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(tokens)} role={role}>
      <article className={styles.record}>
        <div className={styles.actions}>
          {user ? (
            <a className={styles.action} href={`${base}/edit`}>
              Edit
            </a>
          ) : null}

          <form action={moveDocumentAction} className={styles.moveForm}>
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="documentId" value={doc.id} />
            <label className={styles.moveLabel} htmlFor="move-folder">
              Move to:
            </label>
            <select
              id="move-folder"
              name="folderId"
              defaultValue={String(folderIdValue)}
              className={styles.moveSelect}
            >
              <option value="">No folder</option>
              {flatFolders.map(({ folder, depth }) => (
                <option key={folder.id} value={folder.id}>
                  {'\u00A0'.repeat(depth * 2)}
                  {folder.name}
                </option>
              ))}
            </select>
            <button type="submit" className={styles.action}>
              Move
            </button>
          </form>

          <form action={deleteDocumentAction} className={styles.deleteForm}>
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="documentId" value={doc.id} />
            <button type="submit" className={styles.deleteBtn}>
              Delete
            </button>
          </form>

          <CopyMarkdownButton text={doc.body} />

          <a
            className={styles.action}
            href={source === '1' ? base : `${base}?source=1`}
          >
            {source === '1' ? 'Rendered view' : 'Markdown source'}
          </a>
        </div>

        <header className={styles.recordHeader}>
          <h1 className={styles.title}>{doc.title}</h1>
          <div className={styles.meta}>
            {typeof doc.createdAt === 'string' && (
              <span>
                Created{' '}
                {new Date(doc.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {typeof doc.updatedAt === 'string' && doc.updatedAt !== doc.createdAt && (
              <span>
                Updated{' '}
                {new Date(doc.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            <span className={styles.origin}>{doc.origin.replace('-', ' ')}</span>
          </div>
        </header>

        {source === '1' ? (
          <pre className={styles.source}>{doc.body}</pre>
        ) : (
          <div
            className={styles.body}
            // Rendered from tenant-owned canonical Markdown. HTML is not part of
            // the supported dialect; marked escapes HTML in source by default.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </article>
    </TenantShell>
  )
}

import { notFound } from 'next/navigation'

import { CopyMarkdownButton } from '@/components/archive/CopyMarkdownButton'
import { TenantShell } from '@/components/theme/TenantShell'
import { moveDocumentAction } from '@/lib/actions/archive'
import { documentWorkflowAction, softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { originLabel } from '@/lib/origin'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getFoldersForTenant } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'

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
  const payload = await (await import('@/lib/payload')).getLorePayload()
  const [characterLinks, tagLinks] = await Promise.all([getDocumentCharacterLinks(payload, doc.id), getDocumentTags(payload, doc.id)])
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const folderIdValue = typeof doc.folder === 'object' ? doc.folder?.id ?? '' : doc.folder ?? ''

  const tokens = resolveThemeTokens(tenant)
  const html = renderMarkdown(doc.body)
  const base = `/domain/${tenant.slug}/documents/${doc.id}`

  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(tokens)} role={role}>
      <article className={styles.record}>
        <div className={styles.actions}>
          {user ? (
            <a className={styles.action} href={`${base}/edit`}>
              Edit
            </a>
          ) : null}

          <a className={styles.action} href={`${base}/history`}>
            History
          </a>

          {doc.lifecycle === 'draft' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="submit" />
              <button type="submit" className={styles.action}>Submit for review</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'draft' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="file" />
              <button type="submit" className={styles.action}>File now</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'filed' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="lock" />
              <button type="submit" className={styles.action}>Lock</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'locked' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="unlock" />
              <button type="submit" className={styles.action}>Unlock</button>
            </form>
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
              <option value="">Domain Root (default)</option>
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

          <form action={softDeleteDocumentAction} className={styles.deleteForm}>
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
            <span className={styles.origin}>{originLabel(doc.origin)}</span>
            <span className={styles.origin}>{typeof doc.documentType === 'object' ? doc.documentType.name : 'Document'}</span>
            <span className={styles.origin}>{doc.lifecycle.replace('_', ' ')}</span>
          </div>
        </header>

        <section className={styles.metadata} aria-label="Record relationships and tags">
          <div><h2>Prepared by</h2><ul>{characterLinks.docs.filter((link) => link.kind === 'prepared_by').map((link) => <li key={link.id}>{typeof link.character === 'object' ? link.character.name : `Character ${link.character}`}{link.requiredByCreate ? ' (required)' : ''}{role === 'admin' ? <form action="/api/document-links" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="characterId" value={typeof link.character === 'object' ? link.character.id : link.character} /><input type="hidden" name="kind" value="prepared_by" /><input type="hidden" name="action" value="remove" /><button type="submit" disabled={Boolean(link.requiredByCreate)}>Remove</button></form> : null}</li>)}</ul>{characterLinks.docs.every((link) => link.kind !== 'prepared_by') ? <p>No preparation credit recorded.</p> : null}</div>
          <div><h2>Concerns</h2><ul>{characterLinks.docs.filter((link) => link.kind === 'concerns').map((link) => <li key={link.id}>{typeof link.character === 'object' ? link.character.name : `Character ${link.character}`}{link.relationshipLabel ? ` · ${link.relationshipLabel}` : ''}{role === 'admin' ? <form action="/api/document-links" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="characterId" value={typeof link.character === 'object' ? link.character.id : link.character} /><input type="hidden" name="kind" value="concerns" /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form> : null}</li>)}</ul>{role === 'admin' ? <form action="/api/document-links" method="post"><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="kind" value="concerns" /><input name="characterId" type="number" min="1" required placeholder="Character ID" /><input name="relationshipLabel" placeholder="Relationship (optional)" /><button type="submit">Add concern</button></form> : null}</div>
          <div><h2>Tags</h2><ul>{tagLinks.docs.map((link) => <li key={link.id}>{typeof link.tag === 'object' ? link.tag.name : `Tag ${link.tag}`}{role === 'admin' ? <form action="/api/document-tags" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="tagId" value={typeof link.tag === 'object' ? link.tag.id : link.tag} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form> : null}</li>)}</ul>{role === 'admin' ? <form action="/api/document-tags" method="post"><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input name="tagName" required placeholder="Add tag" /><button type="submit">Add tag</button></form> : null}</div>
        </section>

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

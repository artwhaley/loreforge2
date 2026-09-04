import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { documentWorkflowAction, softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'
import { getDocumentRelationships } from '@/lib/documents/relationships'

import styles from './document.module.scss'

type Props = {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ source?: string }>
}

export const dynamic = 'force-dynamic'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

const formatDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return 'unknown date'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function DocumentViewPage({ params, searchParams }: Props) {
  const { slug, id } = await params
  const { source } = await searchParams
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) notFound()

  const doc = await getDocumentForTenant(tenant, id)
  if (!doc) notFound()

  const payload = await (await import('@/lib/payload')).getLorePayload()
  const [characterLinks, tagLinks, relationshipLinks] = await Promise.all([
    getDocumentCharacterLinks(payload, doc.id),
    getDocumentTags(payload, doc.id),
    getDocumentRelationships(payload, doc.id).catch(() => ({ docs: [] })),
  ])

  const supersedesLink = relationshipLinks.docs.find(
    (link) => link.kind === 'supersedes' && relationId(link.source) === Number(doc.id),
  )
  const successorLink = relationshipLinks.docs.find(
    (link) => link.kind === 'supersedes' && relationId(link.target) === Number(doc.id),
  )
  const supersededBy = successorLink?.source && typeof successorLink.source === 'object' ? successorLink.source : null
  const supersededPreparedBy = supersededBy
    ? await getDocumentCharacterLinks(payload, supersededBy.id).catch(() => ({ docs: [] }))
    : { docs: [] }
  const supersededPreparedName = supersededPreparedBy.docs.find((link) => link.kind === 'prepared_by')?.character
  const supersededPreparedLabel = supersededPreparedName && typeof supersededPreparedName === 'object'
    ? supersededPreparedName.name
    : 'unknown Character'

  const preparedBy = characterLinks.docs.find((link) => link.kind === 'prepared_by')?.character
  const preparedByLabel = preparedBy && typeof preparedBy === 'object' ? preparedBy.name : 'No Character credit'
  const concernLinks = characterLinks.docs.filter((link) => link.kind === 'concerns')
  const tokens = resolveThemeTokens(tenant)
  const html = renderMarkdown(doc.body)
  const base = `/domain/${tenant.slug}/documents/${doc.id}`
  const isSuperseded = Boolean(successorLink)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={user ? await getTenantsForUser(user.id) : []}
    >
      <article className={styles.record}>
        <div className={styles.actions} aria-label="Document controls">
          {user && !isSuperseded ? <a className={styles.action} href={`${base}/edit`}>Edit</a> : null}
          <a className={styles.action} href={`${base}/history`}>History</a>
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
          {role === 'admin' && doc.lifecycle === 'filed' && !isSuperseded ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="lock" />
              <button type="submit" className={styles.action}>Lock</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'locked' && !isSuperseded ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="unlock" />
              <button type="submit" className={styles.action}>Unlock</button>
            </form>
          ) : null}
        </div>

        <div className={styles.documentPage}>
          {supersededBy ? (
            <div className={styles.supersededNotice} role="status">
              <strong>Document superseded by:</strong>{' '}
              <a href={`/domain/${tenant.slug}/documents/${supersededBy.id}`}>
                {supersededBy.title}
              </a>{' '}
              prepared on {formatDate(supersededBy.createdAt)} by {supersededPreparedLabel}
            </div>
          ) : null}

          <header className={styles.recordHeader}>
            <h1 className={styles.title}>{doc.title}</h1>
            <div className={styles.meta}>
              <span>Prepared by {preparedByLabel}</span>
              <span>Date {formatDate(doc.createdAt)}</span>
            </div>
          </header>

          {source === '1' ? (
            <pre className={styles.source}>{doc.body}</pre>
          ) : (
            <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
          )}

          <section className={styles.concerns} aria-label="Concerns">
            <h2>Concerns</h2>
            {concernLinks.length > 0 ? (
              <ul>
                {concernLinks.map((link) => (
                  <li key={link.id}>
                    {typeof link.character === 'object' ? link.character.name : `Character ${link.character}`}
                    {link.relationshipLabel ? ` · ${link.relationshipLabel}` : ''}
                  </li>
                ))}
              </ul>
            ) : <p>No Characters attached.</p>}
          </section>

          {tagLinks.docs.length > 0 ? (
            <section className={styles.tags} aria-label="Tags">
              <h2>Tags</h2>
              <ul>
                {tagLinks.docs.map((link) => (
                  <li key={link.id}>{typeof link.tag === 'object' ? link.tag.name : `Tag ${link.tag}`}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {supersedesLink?.target && typeof supersedesLink.target === 'object' ? (
            <p className={styles.supersedesLine}>
              Supersedes <a href={`/domain/${tenant.slug}/documents/${supersedesLink.target.id}`}>{supersedesLink.target.title}</a>.
            </p>
          ) : null}
        </div>

        <div className={styles.bottomActions}>
          {user && !isSuperseded ? (
            <a className={styles.action} href={`/domain/${tenant.slug}/records/new?supersedes=${doc.id}`}>
              Create superseding document
            </a>
          ) : null}

          {role === 'admin' ? (
            <form action="/api/document-shares" method="post" className={styles.shareForm}>
              <input type="hidden" name="domainSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <strong>Share record</strong>
              <select name="principalType" defaultValue="Character" aria-label="Share with type">
                <option value="Character">Character</option>
                <option value="User">User</option>
              </select>
              <input name="principalId" type="number" min="1" required placeholder="Recipient ID" aria-label="Recipient ID" />
              <select name="capability" defaultValue="read" aria-label="Share permission">
                <option value="read">Read</option>
                <option value="edit_document">Edit</option>
              </select>
              <button type="submit" className={styles.action}>Share</button>
            </form>
          ) : null}

          <form action={softDeleteDocumentAction} className={styles.deleteForm}>
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="documentId" value={doc.id} />
            <button type="submit" className={styles.deleteBtn}>Delete</button>
          </form>
        </div>
      </article>
    </TenantShell>
  )
}

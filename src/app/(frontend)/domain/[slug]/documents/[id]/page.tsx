import { DocumentPaper } from '@/components/theme/DocumentPaper'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { documentWorkflowAction, softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'
import { DOCUMENT_MUTATION_ERROR_MESSAGES } from '@/lib/documents/errorCodes'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'
import { getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'
import { canSupersedeDocument } from '@/lib/documents/lifecycle'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { decideInSession, resolveDocumentTarget } from '@/lib/authz/session'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'

import styles from './document.module.scss'

type Props = {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ source?: string; error?: string }>
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
  const { source, error: errorCode } = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) notFound()

  const doc = await getDocumentForTenant(tenant, id)
  if (!doc) notFound()

  const payload = await (await import('@/lib/payload')).getLorePayload()
  const session = user ? await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id) : null
  const docTarget = session ? resolveDocumentTarget(session, { id: Number(doc.id), folderId: relationId(doc.folder), subdomainId: relationId((doc as unknown as { subdomain?: unknown }).subdomain) }) : null
  if (!session || !docTarget || !decideInSession(session, 'read', docTarget).allowed) notFound()
  const canEdit = canEditDocumentBody(doc.lifecycle) && decideInSession(session, 'edit_document', docTarget).allowed
  const [characterLinks, tagLinks, relationshipLinks] = await Promise.all([
    getDocumentCharacterLinks(payload, doc.id),
    getDocumentTags(payload, doc.id),
    payload.find({ collection: 'document-relationships', where: { or: [{ source: { equals: doc.id } }, { target: { equals: doc.id } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true }).catch(() => ({ docs: [] })),
  ])

  // Relationship rows are IDs only. Fetch linked-document metadata after the
  // current document is authorized, then apply the same read decision before
  // rendering a title, date, or credit for any related record.
  const linkedIds = [...new Set(relationshipLinks.docs.flatMap((link) => [relationId(link.source), relationId(link.target)]).filter((linkedId): linkedId is number => linkedId !== null && linkedId !== Number(doc.id)))]
  const linkedDocs = linkedIds.length === 0 ? { docs: [] } : await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: tenant.id } }, { id: { in: linkedIds } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, select: { id: true, domain: true, folder: true, documentType: true, title: true, createdAt: true, updatedAt: true, lifecycle: true }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  const readableLinked = new Map<number, typeof linkedDocs.docs[number]>()
  for (const linked of linkedDocs.docs) {
    const target = resolveDocumentTarget(session, { id: Number(linked.id), folderId: relationId(linked.folder), subdomainId: relationId((linked as unknown as { subdomain?: unknown }).subdomain) })
    if (decideInSession(session, 'read', target).allowed) readableLinked.set(Number(linked.id), linked)
  }

  const supersedesLink = relationshipLinks.docs.find((link) => link.kind === 'supersedes' && relationId(link.source) === Number(doc.id) && readableLinked.has(relationId(link.target) ?? -1))
  const successorLink = relationshipLinks.docs.find((link) => link.kind === 'supersedes' && relationId(link.target) === Number(doc.id) && readableLinked.has(relationId(link.source) ?? -1))
  const supersededBy = successorLink ? readableLinked.get(relationId(successorLink.source) ?? -1) ?? null : null
  const supersededPreparedBy = supersededBy
    ? await getDocumentCharacterLinks(payload, supersededBy.id).catch(() => ({ docs: [] }))
    : { docs: [] }
  const supersededPreparedName = supersededPreparedBy.docs.find((link) => link.kind === 'prepared_by')?.character
  const supersededPreparedLabel = supersededPreparedName && typeof supersededPreparedName === 'object'
    ? supersededPreparedName.name
    : 'unknown Character'

  // P05R-T04 I: render ALL Prepared-by credits in deterministic order (by
  // link id) — services can store more than one, and showing only the first
  // would misrepresent the record.
  const preparedByLinks = characterLinks.docs.filter((link) => link.kind === 'prepared_by').sort((a, b) => Number(a.id) - Number(b.id))
  const preparedByLabel = preparedByLinks.map((link) => typeof link.character === 'object' && link.character ? link.character.name : `Character ${String(link.character)}`).join(', ') || 'No Character credit'
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
      {errorCode && DOCUMENT_MUTATION_ERROR_MESSAGES[errorCode] ? (
        // P05R-T06 E: failed link/tag/relationship mutations surface here with
        // a stable public message; the page still renders so the user can retry.
        <p className={styles.errorNotice} role="alert">{DOCUMENT_MUTATION_ERROR_MESSAGES[errorCode]}</p>
      ) : null}
      <article className={styles.record} data-style={tokens.documentStyle}>
        <div className={styles.actions} aria-label="Document controls">
          {canEdit && !isSuperseded ? <a className={styles.action} href={`${base}/edit`}>Edit</a> : null}
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

        <DocumentPaper title={doc.title} html={html} source={source === '1' ? doc.body : undefined}
          meta={<><span>Prepared by {preparedByLabel}</span><span>Date {formatDate(doc.createdAt)}</span></>}
          before={<>
          {supersededBy ? (
            <div className={styles.supersededNotice} role="status">
              <strong>Document superseded by:</strong>{' '}
              <a href={`/domain/${tenant.slug}/documents/${supersededBy.id}`}>
                {supersededBy.title}
              </a>{' '}
              prepared on {formatDate(supersededBy.createdAt)} by {supersededPreparedLabel}
            </div>
          ) : null}

          </>} >
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
            ) : <p>No {vocab.member.plural} attached.</p>}
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

          {supersedesLink && readableLinked.get(relationId(supersedesLink.target) ?? -1) ? (
            <p className={styles.supersedesLine}>
              Supersedes <a href={`/domain/${tenant.slug}/documents/${relationId(supersedesLink.target)}`}>{readableLinked.get(relationId(supersedesLink.target) ?? -1)?.title}</a>.
            </p>
          ) : null}
        </DocumentPaper>

        <div className={styles.bottomActions}>
          {/* P05R-T08: supersede resolves to the interim admin boundary server-side, so the
              affordance is admin-gated here too (matching Share and RecordsExplorer). */}
          {role === 'admin' && !isSuperseded && canSupersedeDocument(doc.lifecycle) ? (
            <a className={styles.action} href={`/domain/${tenant.slug}/records/new?supersedes=${doc.id}`}>
              Create superseding document
            </a>
          ) : null}

          {role === 'admin' ? (
            <span className={styles.shareForm} title="Document sharing is deferred by owner decision CC-2026-09-03-04.">
              <strong>Share record</strong>
              <button type="button" disabled className={styles.action} aria-disabled="true">Share — planned</button>
            </span>
          ) : null}

          {/* P05R-T08: soft-delete is admin-only (server-enforced); render the control only for admins. */}
          {role === 'admin' ? (
            <form action={softDeleteDocumentAction} className={styles.deleteForm}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <button type="submit" className={styles.deleteBtn}>Delete</button>
            </form>
          ) : null}
        </div>
      </article>
    </TenantShell>
  )
}

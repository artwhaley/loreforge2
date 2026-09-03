import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { restoreDocumentVersionAction } from '@/lib/actions/documentVersions'
import { canEditDocumentBody } from '@/lib/documents/lifecycle'
import { renderMarkdown } from '@/lib/markdown/render'
import { getLorePayload } from '@/lib/payload'
import { describeProvenanceEvent, provenanceTimelineSort, type ProvenanceEventType } from '@/lib/documents/provenance'
import { getDocumentForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = {
  params: Promise<{ slug: string; id: string }>
  searchParams?: Promise<{ revision?: string; error?: string }>
}

export const dynamic = 'force-dynamic'

const labelLifecycle = (value: string | undefined) => (value ?? 'unknown').replace('_', ' ')

export default async function DocumentHistoryPage({ params, searchParams }: Props) {
  const { slug, id } = await params
  const query = await searchParams
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()

  const document = await getDocumentForTenant(tenant, id)
  if (!document) notFound()

  const payload = await getLorePayload()
  const revisions = await payload.findVersions({
    collection: 'documents',
    where: { parent: { equals: document.id } },
    depth: 0,
    limit: 200,
    sort: '-createdAt',
  })
  const events = await payload.find({
    collection: 'document-provenance-events',
    overrideAccess: true,
    where: { and: [{ domain: { equals: tenant.id } }, { document: { equals: document.id } }] },
    depth: 1,
    limit: 200,
    sort: provenanceTimelineSort,
  })

  const selected = query?.revision
    ? await payload.findVersionByID({ collection: 'documents', id: query.revision, depth: 0, disableErrors: true })
    : null
  const selectedBelongs = selected && String(selected.parent) === String(document.id) ? selected : null
  const preview = selectedBelongs?.version
  const currentEditable = canEditDocumentBody(document.lifecycle)
  const previewEditable = preview?.lifecycle ? canEditDocumentBody(preview.lifecycle) : false
  const tenants = await getTenantsForUser(user.id)
  const tokens = resolveThemeTokens(tenant)
  const base = `/domain/${tenant.slug}/documents/${document.id}`

  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(tokens)} role={role} switcherTenants={tenants}>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 0 3rem' }}>
        <p><a href={`/domain/${tenant.slug}/records`}>Records</a> / <a href={base}>{document.title}</a> / History</p>
        <h1>Revision history</h1>
        <p>Every save is retained as a revision. Selecting a revision opens a read-only preview; restoring it writes a new current revision.</p>
        {query?.error ? <p role="alert" style={{ color: '#8f2d21' }}>This revision action could not be completed ({query.error.replaceAll('-', ' ')}).</p> : null}

        {selectedBelongs ? (
          <section aria-labelledby="preview-heading" style={{ border: '1px solid var(--tenant-accent)', padding: '1rem', margin: '1.25rem 0', background: 'var(--tenant-surface-bg)' }}>
            <h2 id="preview-heading">Preview: {preview?.title ?? document.title}</h2>
            <p><small>{selectedBelongs.createdAt ? new Date(selectedBelongs.createdAt).toLocaleString() : 'Unknown time'} · {labelLifecycle(preview?.lifecycle)}</small></p>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(preview?.body ?? '') }} />
            {currentEditable && previewEditable ? (
              <form action={restoreDocumentVersionAction} style={{ marginTop: '1rem' }}>
                <input type="hidden" name="tenantSlug" value={tenant.slug} />
                <input type="hidden" name="documentId" value={document.id} />
                <input type="hidden" name="versionId" value={selectedBelongs.id} />
                <button type="submit">Restore this revision as new current</button>
              </form>
            ) : <p><small>Restore is unavailable while the current record or this revision is read-only.</small></p>}
          </section>
        ) : query?.revision ? <p role="alert">That revision does not belong to this record.</p> : null}

        <section aria-labelledby="revisions-heading">
          <h2 id="revisions-heading">Revisions ({revisions.docs.length})</h2>
          {revisions.docs.length === 0 ? <p>No revisions have been recorded yet.</p> : (
            <ol style={{ display: 'grid', gap: '.7rem', paddingLeft: '1.25rem' }}>
              {revisions.docs.map((revision) => {
                const snapshot = revision.version
                return (
                  <li key={revision.id}>
                    <a href={`${base}/history?revision=${encodeURIComponent(revision.id)}`}>
                      {snapshot.title || document.title}
                    </a>{' '}
                    <small>· {revision.createdAt ? new Date(revision.createdAt).toLocaleString() : 'Unknown time'} · {labelLifecycle(snapshot.lifecycle)}</small>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="timeline-heading" style={{ marginTop: '2rem' }}>
          <h2 id="timeline-heading">Timeline ({events.docs.length})</h2>
          {events.docs.length === 0 ? <p>No provenance events have been recorded yet.</p> : (
            <ol style={{ display: 'grid', gap: '.8rem', paddingLeft: '1.25rem' }}>
              {events.docs.map((event) => {
                const actorUser = typeof event.actorUser === 'object' ? event.actorUser?.name : null
                const actorCharacter = typeof event.actorCharacter === 'object' ? event.actorCharacter?.name : null
                const actor = [actorUser, actorCharacter].filter(Boolean).join(' · ') || 'System'
                const context = event.context && typeof event.context === 'object' && !Array.isArray(event.context) ? event.context as Record<string, unknown> : undefined
                return (
                  <li key={event.id}>
                    <strong>{actor}</strong> {describeProvenanceEvent(event.eventType as ProvenanceEventType, context)}{' '}
                    <small>{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : 'Unknown time'}</small>
                    {event.revisionId ? <> · <a href={`${base}/history?revision=${encodeURIComponent(event.revisionId)}`}>View revision</a></> : null}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </main>
    </TenantShell>
  )
}

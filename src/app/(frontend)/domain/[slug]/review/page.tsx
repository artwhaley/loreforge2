import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { documentWorkflowAction } from '@/lib/actions/documentWorkflow'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }
export const dynamic = 'force-dynamic'

export default async function ReviewQueuePage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user || role !== 'admin') notFound()
  const payload = await getLorePayload()
  const pending = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: tenant.id } }, { lifecycle: { equals: 'pending_review' } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 1, limit: 200, sort: '-updatedAt' })
  const switcherTenants = await getTenantsForUser(user.id)
  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={switcherTenants}>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 0 3rem' }}>
        <p><a href={`/domain/${tenant.slug}`}>Home</a> / Review queue</p>
        <h1>Review queue</h1>
        <p>Pending records are frozen until a Domain supervisor approves or returns them to Draft.</p>
        {query?.error ? <p role="alert" style={{ color: '#8f2d21' }}>The requested transition could not be completed ({query.error.replaceAll('-', ' ')}).</p> : null}
        {pending.docs.length === 0 ? <p>No records are waiting for review.</p> : (
          <ul style={{ display: 'grid', gap: '1rem', padding: 0, listStyle: 'none' }}>
            {pending.docs.map((document) => (
              <li key={document.id} style={{ border: '1px solid var(--tenant-accent)', padding: '1rem', background: 'var(--tenant-surface-bg)' }}>
                <h2 style={{ marginTop: 0 }}><a href={`/domain/${tenant.slug}/documents/${document.id}`}>{document.title}</a></h2>
                <p><small>Updated {new Date(document.updatedAt).toLocaleString()}</small></p>
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  <form action={documentWorkflowAction}><input type="hidden" name="tenantSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={document.id} /><input type="hidden" name="operation" value="approve" /><button type="submit">Approve and file</button></form>
                  <form action={documentWorkflowAction}><input type="hidden" name="tenantSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={document.id} /><input type="hidden" name="operation" value="reject" /><input name="note" placeholder="Optional reason" aria-label={`Reason for returning ${document.title}`} /><button type="submit">Return to Draft</button></form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </TenantShell>
  )
}

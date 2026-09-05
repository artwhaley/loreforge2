import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { projectDomainWork } from '@/lib/work/projection'
import { documentWorkflowAction } from '@/lib/actions/documentWorkflow'

export const dynamic = 'force-dynamic'

export default async function DomainWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const work = await projectDomainWork(payload, { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, tenant.id, { domainSlug: slug })
  if (!work.authorized) notFound()
  const domains = await getTenantsForUser(user.id)
  const requestEntries = work.entries.filter((entry) => entry.kind === 'join' || entry.kind === 'claim')
  const documentEntries = work.entries.filter((entry) => entry.kind === 'document')
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <nav aria-label="Work navigation"><Link href={`/domain/${slug}`}>Domain home</Link> · <Link href={`/domain/${slug}/work`} aria-current="page">Work</Link>{work.domainAdmin ? <> · <Link href={`/domain/${slug}/manage/invitations`}>Invitations</Link></> : null}</nav>
      <div><h1>Work</h1><p>{work.domainAdmin ? 'Requests and records that need your attention in this Domain.' : 'Records you are allowed to approve in this Domain.'}</p></div>
      {work.domainAdmin ? <section><h2>People requests</h2>{requestEntries.length === 0 ? <p>Nothing is waiting for a Domain decision.</p> : <ul style={{ display: 'grid', gap: '.6rem', listStyle: 'none', padding: 0 }}>{requestEntries.map((entry) => <li key={`${entry.kind}-${entry.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap', padding: '.8rem', border: '1px solid var(--tenant-border, #ddd)' }}><span><strong>{entry.title}</strong><br /><small>{entry.summary}</small></span><Link href={entry.href ?? `/domain/${slug}/manage/invitations`}>Open</Link></li>)}</ul>}</section> : null}
      <section><h2>Pending records</h2>{documentEntries.length === 0 ? <p>Records awaiting review will appear here when you have <code>approve_document</code> access on their Document Type.</p> : <ul style={{ display: 'grid', gap: '.8rem', listStyle: 'none', padding: 0 }}>{documentEntries.map((entry) => <li key={`document-${entry.id}`} style={{ padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}><h3 style={{ marginTop: 0 }}><Link href={entry.href ?? `/domain/${slug}/documents/${entry.id}`}>{entry.title}</Link></h3><p><small>{entry.folderName ? `Folder: ${entry.folderName} · ` : ''}{entry.requestedAt ? new Date(entry.requestedAt).toLocaleString() : 'Recently updated'}</small></p><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><form action={documentWorkflowAction}><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="documentId" value={entry.id} /><input type="hidden" name="operation" value="approve" /><button type="submit">Approve and file</button></form><form action={documentWorkflowAction}><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="documentId" value={entry.id} /><input type="hidden" name="operation" value="reject" /><button type="submit">Return to Draft</button></form></div></li>)}</ul>}</section>
    </section>
  </TenantShell>
}


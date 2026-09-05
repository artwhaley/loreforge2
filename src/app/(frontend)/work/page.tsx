import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { projectPlatformWork } from '@/lib/work/projection'

type Props = { searchParams?: Promise<{ error?: string; created?: string; issued?: string; decided?: string }> }

export const dynamic = 'force-dynamic'

export default async function WorkPage({ searchParams }: Props) {
  const query = await searchParams
  const context = await getActiveContext()
  if (!context.user) return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Work</p><h1 className={styles.sectionTitle}>Sign in to see your work.</h1><p className={styles.sectionLead}>Pending work is scoped to the acting Character you select.</p><p><Link href="/#login" className={styles.primary}>Sign in</Link></p></section></PlatformShell>
  const payload = await getLorePayload()
  const actor = { userId: context.user.id, activeCharacterId: context.activeCharacter?.id ?? null }
  const kind = String((context.activeCharacter as { kind?: unknown } | null)?.kind ?? '')
  if (kind === 'domain_admin' && context.tenant) redirect(`/domain/${context.tenant.slug}/work`)
  if (kind !== 'platform_admin') {
    if (context.tenant) redirect(`/domain/${context.tenant.slug}/work`)
    return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Work</p><h1 className={styles.sectionTitle}>Choose a Domain.</h1><p className={styles.sectionLead}>Select an active ordinary Character and Domain to see records waiting for your approved capabilities.</p><p><Link href="/" className={styles.primary}>Return to dashboard</Link></p></section></PlatformShell>
  }
  const work = await projectPlatformWork(payload, actor)
  if (!work.authorized) notFound()
  const [bootstrap, merges, setupDomains] = await Promise.all([
    payload.find({ collection: 'domain-bootstrap-requests', where: { status: { equals: 'pending' } }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    payload.find({ collection: 'character-merge-requests', where: { status: { equals: 'pending' } }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    payload.find({ collection: 'domains', where: { and: [{ kind: { equals: 'community' } }, { lifecycle: { equals: 'setup-pending' } }] }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Platform Work</p><h1 className={styles.sectionTitle}>Platform administration</h1><p className={styles.sectionLead}>Bootstrap requests and platform-owned review work live here. Domain queues stay with their matching Domain Administrator identity.</p>{query?.error ? <p className={styles.error} role="alert">That platform action could not be completed.</p> : null}{query?.issued ? <div className={styles.emptyCard}><strong>Copy Link</strong><br /><code>{`/invite/${encodeURIComponent(query.issued)}`}</code></div> : null}
    <section style={{ marginTop: '1.5rem' }}><h2>New setup-pending Domain</h2><form action="/api/domains/setup-pending" method="post" style={{ display: 'grid', gap: '.55rem', maxWidth: '34rem' }}><div className={styles.field}><label htmlFor="work-domain-name">Name</label><input id="work-domain-name" name="name" required /></div><div className={styles.field}><label htmlFor="work-domain-slug">Slug</label><input id="work-domain-slug" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></div><button className={styles.primary} type="submit">Create setup-pending Domain</button></form></section>
    <section style={{ marginTop: '1.8rem' }}><h2>Bootstrap invitations</h2>{setupDomains.docs.length === 0 ? <p>No setup-pending Domains need an invitation.</p> : <ul className={styles.simpleList}>{setupDomains.docs.map((domain) => <li key={domain.id} className={styles.emptyCard}><strong>{domain.name}</strong><span style={{ display: 'block', marginTop: '.45rem' }}><form action="/api/invitations/issue" method="post"><input type="hidden" name="purpose" value="domain_bootstrap" /><input type="hidden" name="domainId" value={domain.id} /><label>Expires (optional) <input name="expiresAt" type="datetime-local" /></label><button type="submit">Create bootstrap link</button></form></span></li>)}</ul>}</section>
    <section style={{ marginTop: '1.8rem' }}><h2>Pending bootstrap requests</h2>{bootstrap.docs.length === 0 ? <p>Accepted bootstrap links will appear here.</p> : <ul className={styles.simpleList}>{bootstrap.docs.map((request) => <li key={request.id} className={styles.emptyCard}><strong>{typeof request.domain === 'object' ? request.domain.name : `Domain ${request.domain}`}</strong><span style={{ display: 'block' }}>Requested by {typeof request.user === 'object' ? request.user.name ?? request.user.email : request.user} · {new Date(request.requestedAt).toLocaleString()}</span><span style={{ display: 'inline-flex', gap: '.5rem', marginTop: '.6rem' }}><form action="/api/invitations/bootstrap-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="decision" value="approved" /><button type="submit">Approve</button></form><form action="/api/invitations/bootstrap-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="decision" value="rejected" /><button type="submit">Reject</button></form></span></li>)}</ul>}</section>
    <section style={{ marginTop: '1.8rem' }}><h2>Existing platform merge requests</h2>{merges.docs.length === 0 ? <p>No pending Character merges.</p> : <ul className={styles.simpleList}>{merges.docs.map((request) => <li key={request.id} className={styles.emptyCard}>{typeof request.source === 'object' ? request.source.name : `Character ${request.source}`} · target {request.target && typeof request.target === 'object' ? request.target.name : request.target != null ? request.target : 'not selected'}</li>)}</ul>}</section>
  </section></PlatformShell>
}

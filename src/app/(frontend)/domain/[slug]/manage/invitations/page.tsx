import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { IssueCharacterInvitationPanel, IssueDomainJoinPanel } from '@/components/invitations/IssueInvitationPanel'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { buildInvitationsManagementPageModel } from '@/lib/invitations/buildInvitationsManagementPageModel'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ created?: string; error?: string; revoked?: string; decided?: string }> }

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

/**
 * Invitation management (OBSIDIAN-T07). Thin route: the authorized builder
 * owns admission (`canManageDomainInvitations`) and the semantic model of
 * issued links, pending join/claim requests, and claim targets. The body
 * renders inside the selected Design's Shell via the design-aware
 * TenantShell. T08 moves it behind a Design-owned entrypoint.
 */
export default async function DomainInvitationsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const model = await buildInvitationsManagementPageModel({ tenant, user, activeCharacterId: activeCharacter?.id ?? null, statusQuery: query })
  if (!model.canManage) notFound()
  const domains = await getTenantsForUser(user.id)
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: '1.2rem' }}>
      <nav aria-label="Domain management"><Link href={`/domain/${slug}`}>Domain home</Link> · <Link href={`/domain/${slug}/manage/people`}>People</Link> · <Link href={`/domain/${slug}/manage/invitations`} aria-current="page">Invitations</Link></nav>
      <div><h1>Invitations</h1><p>Share secure links with people you want to welcome. Loreforge does not send email.</p></div>
      {model.status?.level === 'info' ? <p role="status">{model.status.message}</p> : null}
      {model.status?.level === 'error' ? <p role="alert">{model.status.message}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem' }}>
        <IssueCharacterInvitationPanel domainId={Number(tenant.id)} tenantSlug={slug} targets={model.claimTargets} />
        <IssueDomainJoinPanel domainId={Number(tenant.id)} tenantSlug={slug} />
      </div>
      <div><h2>Pending Domain join requests</h2>{model.pendingJoins.length === 0 ? <p>No pending join requests.</p> : <ul style={{ display: 'grid', gap: '.55rem', listStyle: 'none', padding: 0 }}>{model.pendingJoins.map((request) => <li key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', padding: '.8rem', border: '1px solid var(--tenant-border, #ddd)' }}><span><strong>{request.applicantLabel}</strong> · {request.characterLabel}</span><span style={{ display: 'inline-flex', gap: '.4rem' }}><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="decision" value="approved" /><button type="submit">Approve</button></form><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="decision" value="rejected" /><button type="submit">Reject</button></form></span></li> )}</ul>}</div>
      <div><h2>Issued links</h2>{model.invitations.length === 0 ? <p>No invitation links yet.</p> : <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Purpose</th><th>Target</th><th>Issued</th><th>Expires</th><th>Uses</th><th>State</th><th /></tr></thead><tbody>{model.invitations.map((invitation) => <tr key={invitation.id}><td>{invitation.purpose}</td><td>{invitation.targetLabel}</td><td>{invitation.issuedByLabel ?? '—'}</td><td>{invitation.expiresLabel}</td><td>{invitation.useLabel}</td><td>{invitation.statusLabel}</td><td>{invitation.canRevoke ? <form action="/api/invitations/revoke" method="post"><input type="hidden" name="invitationId" value={invitation.id} /><input type="hidden" name="tenantSlug" value={slug} /><button type="submit">Revoke</button></form> : null}</td></tr>)}</tbody></table></div>}</div>
    </section>
  </TenantShell>
}
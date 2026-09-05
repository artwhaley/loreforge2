import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { InvitationCopyLink } from '@/components/invitations/InvitationCopyLink'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { canManageDomainInvitations } from '@/lib/invitations/workflows'
import { invitationPurposeLabel, isInvitationToken } from '@/lib/invitations/types'
import { listInvitations } from '@/lib/invitations/service'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ issued?: string; error?: string; revoked?: string; decided?: string }> }

export const dynamic = 'force-dynamic'

export default async function DomainInvitationsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const actor = { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }
  if (!await canManageDomainInvitations(payload, actor, tenant.id)) notFound()
  const [invitations, joinRequests, characters, domains] = await Promise.all([
    listInvitations(payload, { domainId: tenant.id }),
    payload.find({ collection: 'domain-join-requests', where: { and: [{ domain: { equals: tenant.id } }, { status: { equals: 'pending' } }] }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    payload.find({ collection: 'characters', where: { and: [{ status: { equals: 'active' } }, { kind: { in: ['player', 'npc'] } }] }, depth: 0, limit: 0, pagination: false, sort: 'name', overrideAccess: true }),
    getTenantsForUser(user.id),
  ])
  const claimTargets = []
  for (const character of characters.docs) {
    if (character.controlledBy != null) continue
    const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: character.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (membership.docs[0]) claimTargets.push(character)
  }
  const issuedToken = isInvitationToken(query?.issued) ? query?.issued : null
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: '1.2rem' }}>
      <nav aria-label="Domain management"><Link href={`/domain/${slug}`}>Domain home</Link> · <Link href={`/domain/${slug}/manage/people`}>People</Link> · <Link href={`/domain/${slug}/manage/invitations`} aria-current="page">Invitations</Link></nav>
      <div><h1>Invitations</h1><p>Share secure links with people you want to welcome. Loreforge does not send email.</p></div>
      {issuedToken ? <div style={{ padding: '.9rem', border: '1px solid var(--tenant-border, #ddd)' }}><strong>Copy Link</strong><br /><InvitationCopyLink href={`/invite/${encodeURIComponent(issuedToken)}`} /></div> : null}
      {query?.error ? <p role="alert">That invitation action could not be completed.</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem' }}>
        <form action="/api/invitations/issue" method="post" style={{ display: 'grid', gap: '.55rem', padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}><h2>Invite an existing Character</h2><input type="hidden" name="purpose" value="character_claim" /><input type="hidden" name="domainId" value={tenant.id} /><input type="hidden" name="tenantSlug" value={slug} /><label>Unclaimed Character<select name="characterId" required><option value="">Choose a Character</option>{claimTargets.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label><label>Expires (optional)<input name="expiresAt" type="datetime-local" /></label><button type="submit">Create Character link</button></form>
        <form action="/api/invitations/issue" method="post" style={{ display: 'grid', gap: '.55rem', padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}><h2>Invite Domain participation</h2><input type="hidden" name="purpose" value="domain_join" /><input type="hidden" name="domainId" value={tenant.id} /><input type="hidden" name="tenantSlug" value={slug} /><label>Maximum uses (optional)<input name="maxUses" type="number" min="2" placeholder="Unlimited" /></label><label>Expires (optional)<input name="expiresAt" type="datetime-local" /></label><button type="submit">Create Domain link</button></form>
      </div>
      <div><h2>Pending Domain join requests</h2>{joinRequests.docs.length === 0 ? <p>No pending join requests.</p> : <ul style={{ display: 'grid', gap: '.55rem', listStyle: 'none', padding: 0 }}>{joinRequests.docs.map((request) => { const applicant = typeof request.user === 'object' ? request.user.name ?? request.user.email : String(request.user); const rawCharacter = request.character; const character = rawCharacter && typeof rawCharacter === 'object' ? rawCharacter.name : rawCharacter != null ? `Character ${rawCharacter}` : `New Character: ${request.requestedName}`; return <li key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', padding: '.8rem', border: '1px solid var(--tenant-border, #ddd)' }}><span><strong>{applicant}</strong> · {character}</span><span style={{ display: 'inline-flex', gap: '.4rem' }}><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="decision" value="approved" /><button type="submit">Approve</button></form><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="decision" value="rejected" /><button type="submit">Reject</button></form></span></li> })}</ul>}</div>
      <div><h2>Issued links</h2>{invitations.length === 0 ? <p>No invitation links yet.</p> : <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Purpose</th><th>Target</th><th>Issued</th><th>Expires</th><th>Uses</th><th>State</th><th /></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.id}><td>{invitationPurposeLabel(invitation.purpose)}</td><td>{invitation.character?.name ?? invitation.domain?.name ?? '—'}</td><td>{invitation.issuedByCharacter?.name ?? invitation.issuedByUser?.name ?? '—'}</td><td>{invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString() : 'Never'}</td><td>{invitation.useCount}{invitation.maxUses == null ? '' : ` / ${invitation.maxUses}`}</td><td>{invitation.status === 'revoked' ? 'Revoked' : invitation.status === 'expired' ? 'Expired' : invitation.status === 'exhausted' ? 'Exhausted' : invitation.status === 'invalid' ? 'Unavailable' : 'Active'}</td><td>{invitation.status === 'valid' ? <form action="/api/invitations/revoke" method="post"><input type="hidden" name="invitationId" value={invitation.id} /><input type="hidden" name="tenantSlug" value={slug} /><button type="submit">Revoke</button></form> : null}</td></tr>)}</tbody></table></div>}</div>
    </section>
  </TenantShell>
}

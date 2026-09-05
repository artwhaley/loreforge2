'use client'

import { useActionState } from 'react'

import { issueInvitationAction, type IssueInvitationState } from '@/lib/actions/invitations'
import { InvitationCopyLink } from './InvitationCopyLink'

const initial: IssueInvitationState = { ok: false }

function OnceLink({ link }: { link: string }) {
  return (
    <div style={{ padding: '.9rem', border: '1px solid var(--tenant-border, #ddd)' }} aria-live="polite">
      <strong>Copy Link</strong>
      <p style={{ margin: '.4rem 0' }}>This link is shown once. Copy it now — refreshing will not reveal it again.</p>
      <InvitationCopyLink href={link} />
    </div>
  )
}

export function IssueCharacterInvitationPanel({ domainId, tenantSlug, targets }: { domainId: number; tenantSlug: string; targets: Array<{ id: number | string; name: string }> }) {
  const [state, formAction] = useActionState(issueInvitationAction, initial)
  return (
    <div style={{ display: 'grid', gap: '.55rem', padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}>
      <h2>Invite an existing Character</h2>
      {state.ok && state.link ? <OnceLink link={state.link} /> : null}
      {!state.ok && state.error ? <p role="alert">That invitation could not be created.</p> : null}
      <form action={formAction} style={{ display: 'grid', gap: '.55rem' }}>
        <input type="hidden" name="purpose" value="character_claim" />
        <input type="hidden" name="domainId" value={domainId} />
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <label>Unclaimed Character<select name="characterId" required><option value="">Choose a Character</option>{targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Expires (optional)<input name="expiresAt" type="datetime-local" /></label>
        <button type="submit">Create Character link</button>
      </form>
    </div>
  )
}

export function IssueDomainJoinPanel({ domainId, tenantSlug }: { domainId: number; tenantSlug: string }) {
  const [state, formAction] = useActionState(issueInvitationAction, initial)
  return (
    <div style={{ display: 'grid', gap: '.55rem', padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}>
      <h2>Invite Domain participation</h2>
      {state.ok && state.link ? <OnceLink link={state.link} /> : null}
      {!state.ok && state.error ? <p role="alert">That invitation could not be created.</p> : null}
      <form action={formAction} style={{ display: 'grid', gap: '.55rem' }}>
        <input type="hidden" name="purpose" value="domain_join" />
        <input type="hidden" name="domainId" value={domainId} />
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <label>Maximum uses (optional)<input name="maxUses" type="number" min="2" placeholder="Unlimited" /></label>
        <label>Expires (optional)<input name="expiresAt" type="datetime-local" /></label>
        <button type="submit">Create Domain link</button>
      </form>
    </div>
  )
}

export function IssueBootstrapPanel({ domainId, tenantSlug }: { domainId: number; tenantSlug?: string }) {
  const [state, formAction] = useActionState(issueInvitationAction, initial)
  return (
    <span style={{ display: 'block', marginTop: '.45rem' }}>
      {state.ok && state.link ? <OnceLink link={state.link} /> : null}
      {!state.ok && state.error ? <p role="alert">That invitation could not be created.</p> : null}
      <form action={formAction}>
        <input type="hidden" name="purpose" value="domain_bootstrap" />
        <input type="hidden" name="domainId" value={domainId} />
        {tenantSlug ? <input type="hidden" name="tenantSlug" value={tenantSlug} /> : null}
        <label>Expires (optional) <input name="expiresAt" type="datetime-local" /></label>
        <button type="submit">Create bootstrap link</button>
      </form>
    </span>
  )
}
